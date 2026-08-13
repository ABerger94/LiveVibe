import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password, displayName, bio, interests, city } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name, bio, interests, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, display_name`,
      [username, email, hash, displayName, bio, interests || [], city]
    );

    const token = generateToken(result.rows[0].id);
    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);
  res.json({ 
    user: { id: user.id, username: user.username, displayName: user.display_name },
    token 
  });
});

export default router;
