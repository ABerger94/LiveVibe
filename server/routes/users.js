import { Router } from 'express';
import { pool } from '../db.js';
import { redis } from '../redis.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get nearby online users
router.get('/nearby', authenticate, async (req, res) => {
  const { lat, lng, radius = 30 } = req.query; // radius in miles
  const userId = req.user.userId;

  if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

  // Convert miles to meters for PostGIS
  const radiusMeters = radius * 1609.34;

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

  res.json(result.rows);
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

export default router;
