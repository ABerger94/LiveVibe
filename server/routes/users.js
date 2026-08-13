import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { redis } from '../redis.js';
import { authenticate } from '../middleware/auth.js';
import { supabase, AVATAR_BUCKET, PHOTO_BUCKET } from '../supabase.js';
import { fuzzLocation } from '../geoFuzz.js';

const router = Router();
const MAX_PHOTOS = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Get nearby online users
router.get('/nearby', authenticate, async (req, res) => {
  const { lat, lng, radius = 30 } = req.query; // radius in miles
  const userId = req.user.userId;

  if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

  // Convert miles to meters for PostGIS
  const radiusMeters = radius * 1609.34;

  // lat/lng here are each user's real coordinates, used only for the
  // server-side distance/radius math below — they must never reach the
  // client as-is. The response replaces them with a fuzzed position
  // (see geoFuzz.js) before anything goes out over res.json().
  const result = await pool.query(
    `SELECT id, username, display_name, bio, interests, avatar_url, lat, lng,
            ST_Distance(
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
              ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            ) / 1609.34 as distance_miles
     FROM users
     WHERE id != $3
       AND is_online = true
       AND last_active_at > NOW() - INTERVAL '5 minutes'
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         $4
       )
     ORDER BY distance_miles
     LIMIT 50`,
    [lng, lat, userId, radiusMeters]
  );

  const fuzzedUsers = result.rows.map(row => {
    const { lat: fuzzedLat, lng: fuzzedLng } = fuzzLocation(row.id, row.lat, row.lng);
    return {
      ...row,
      lat: fuzzedLat,
      lng: fuzzedLng,
      // Rounded so it doesn't hand back the precision the fuzzed pin just took away
      distance_miles: Math.round(row.distance_miles * 2) / 2
    };
  });

  res.json(fuzzedUsers);
});

// Update location & online status
router.post('/location', authenticate, async (req, res) => {
  const { lat, lng } = req.body;
  const userId = req.user.userId;

  await pool.query(
    `UPDATE users SET lat = $1, lng = $2, location_updated_at = NOW(),
     is_online = true, last_active_at = NOW() WHERE id = $3`,
    [lat, lng, userId]
  );

  // Store in Redis for Socket.io lookups
  await redis.geoAdd('user_locations', { longitude: lng, latitude: lat, member: userId });
  await redis.set(`user:${userId}:online`, '1', { EX: 300 }); // 5 min TTL

  res.json({ success: true });
});

// Get my profile
router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, display_name, bio, interests, avatar_url,
            messages_remaining, messages_reset_at, city
     FROM users WHERE id = $1`,
    [req.user.userId]
  );
  res.json(result.rows[0]);
});

// Update my profile
router.patch('/me', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { displayName, bio, city, interests } = req.body;

  if (interests !== undefined && !Array.isArray(interests)) {
    return res.status(400).json({ error: 'interests must be an array of strings' });
  }

  const result = await pool.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       bio = COALESCE($2, bio),
       city = COALESCE($3, city),
       interests = COALESCE($4, interests)
     WHERE id = $5
     RETURNING id, username, display_name, bio, interests, avatar_url, city`,
    [displayName ?? null, bio ?? null, city ?? null, interests ?? null, userId]
  );

  res.json(result.rows[0]);
});

// Upload/replace my avatar
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Avatar uploads are not configured on this server' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded (field name must be "avatar")' });
  }

  const userId = req.user.userId;
  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

  if (uploadError) {
    console.error('Avatar upload failed:', uploadError);
    return res.status(502).json({ error: 'Failed to store image' });
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Cache-bust: the storage path is stable per user, so append a version
  // param or the browser/CDN will keep serving the old cached image.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);

  res.json({ avatarUrl });
});

// Get a user's photo gallery (works for your own id or anyone else's —
// gallery photos are visible to any authenticated user, same as bio/avatar)
router.get('/:userId/photos', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position ASC, created_at ASC',
    [req.params.userId]
  );
  res.json(result.rows);
});

// Add a photo to my gallery
router.post('/me/photos', authenticate, upload.single('photo'), async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Photo uploads are not configured on this server' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded (field name must be "photo")' });
  }

  const userId = req.user.userId;

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS count FROM user_photos WHERE user_id = $1',
    [userId]
  );
  const count = countResult.rows[0].count;
  if (count >= MAX_PHOTOS) {
    return res.status(400).json({ error: `You can upload up to ${MAX_PHOTOS} photos` });
  }

  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const storagePath = `${userId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

  if (uploadError) {
    console.error('Photo upload failed:', uploadError);
    return res.status(502).json({ error: 'Failed to store image' });
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);

  const result = await pool.query(
    `INSERT INTO user_photos (user_id, url, storage_path, position)
     VALUES ($1, $2, $3, $4) RETURNING id, url, position`,
    [userId, data.publicUrl, storagePath, count]
  );

  res.json(result.rows[0]);
});

// Remove a photo from my gallery
router.delete('/me/photos/:photoId', authenticate, async (req, res) => {
  const userId = req.user.userId;

  const existing = await pool.query(
    'SELECT storage_path FROM user_photos WHERE id = $1 AND user_id = $2',
    [req.params.photoId, userId]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  if (supabase) {
    const { error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([existing.rows[0].storage_path]);
    if (removeError) console.error('Failed to delete photo from storage:', removeError);
  }

  await pool.query('DELETE FROM user_photos WHERE id = $1', [req.params.photoId]);
  res.json({ success: true });
});

export default router;
