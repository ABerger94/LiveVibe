import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get conversation with a user
router.get('/:userId', authenticate, async (req, res) => {
  const myId = req.user.userId;
  const theirId = req.params.userId;

  const result = await pool.query(
    `SELECT m.*, 
            u1.username as sender_username,
            u2.username as recipient_username
     FROM messages m
     JOIN users u1 ON m.sender_id = u1.id
     JOIN users u2 ON m.recipient_id = u2.id
     WHERE (sender_id = $1 AND recipient_id = $2)
        OR (sender_id = $2 AND recipient_id = $1)
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [myId, theirId]
  );

  // Mark as read
  await pool.query(
    `UPDATE messages SET is_read = true 
     WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false`,
    [theirId, myId]
  );

  res.json(result.rows.reverse());
});

// Send message
router.post('/:userId', authenticate, async (req, res) => {
  const senderId = req.user.userId;
  const recipientId = req.params.userId;
  const { content } = req.body;

  if (!content?.trim()) return res.status(400).json({ error: 'Message required' });

  // Check if they've conversed before
  const existing = await pool.query(
    `SELECT id FROM conversations 
     WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
    [senderId, recipientId]
  );

  if (existing.rows.length === 0) {
    // First conversation — check message quota
    const sender = await pool.query(
      `SELECT messages_remaining, messages_reset_at FROM users WHERE id = $1`,
      [senderId]
    );

    let { messages_remaining, messages_reset_at } = sender.rows[0];

    // Reset if it's been 24 hours
    if (new Date(messages_reset_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      messages_remaining = 5;
      await pool.query(
        `UPDATE users SET messages_remaining = 5, messages_reset_at = NOW() WHERE id = $1`,
        [senderId]
      );
    }

    if (messages_remaining <= 0) {
      return res.status(403).json({ error: 'Daily message limit reached. Wait for a reply or upgrade.' });
    }

    // Deduct one
    await pool.query(
      `UPDATE users SET messages_remaining = messages_remaining - 1 WHERE id = $1`,
      [senderId]
    );
  }

  // Insert message
  const msgResult = await pool.query(
    `INSERT INTO messages (sender_id, recipient_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [senderId, recipientId, content]
  );

  // Create/update conversation
  await pool.query(
    `INSERT INTO conversations (user1_id, user2_id, last_message_at)
     VALUES (LEAST($1,$2), GREATEST($1,$2), NOW())
     ON CONFLICT (user1_id, user2_id) 
     DO UPDATE SET last_message_at = NOW()`,
    [senderId, recipientId]
  );

  res.json(msgResult.rows[0]);
});

export default router;
