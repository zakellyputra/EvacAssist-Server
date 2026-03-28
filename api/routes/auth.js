import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

function issueTokens(user) {
  const payload = { id: user._id, role: user.role };
  const access_token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh_token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access_token, refresh_token };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, phone, role, vehicle, wallet_address } = req.body;
  const phone_hash = await bcrypt.hash(phone, 10);
  const user = await User.create({ name, phone_hash, role, vehicle, wallet_address });
  res.status(201).json({ user_id: user._id, ...issueTokens(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  // In a real system: find user by phone_hash comparison. For MVP, simplified.
  const users = await User.find({});
  const user = await Promise.any(
    users.map(async (u) => {
      const match = await bcrypt.compare(phone, u.phone_hash);
      if (!match) throw new Error('no match');
      return u;
    })
  ).catch(() => null);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(issueTokens(user));
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;
  try {
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const access_token = jwt.sign({ id: payload.id, role: payload.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ access_token });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
