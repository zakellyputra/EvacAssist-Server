import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

function normalizeUsername(username = '') {
  return username.trim().toLowerCase();
}

function issueTokens(user) {
  const payload = { id: user._id, role: user.role, username: user.username };
  const access_token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh_token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access_token, refresh_token };
}

router.post('/register', async (req, res) => {
  try {
    const { name, username, phone, password, role = 'rider', vehicle, wallet_address } = req.body;
    const identifier = phone ?? username;

    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!identifier?.trim()) return res.status(400).json({ error: 'username or phone is required' });
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!['rider', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'role must be rider or driver' });
    }

    const username_normalized = normalizeUsername(identifier);
    const existing = await User.findOne({ username_normalized });
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const approval_status = 'approved';
    const user = await User.create({
      name: name.trim(),
      username: identifier.trim(),
      username_normalized,
      password_hash,
      role,
      approval_status,
      vehicle,
      wallet_address,
    });

    res.status(201).json({
      user_id: user._id,
      approval_status: user.approval_status,
      ...issueTokens(user),
    });
  } catch (error) {
    console.error('[auth/register]', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    const identifier = phone ?? username;
    if (!identifier?.trim() || !password) {
      return res.status(400).json({ error: 'username or phone and password are required' });
    }

    const user = await User.findOne({ username_normalized: normalizeUsername(identifier) });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role === 'driver' && user.approval_status === 'rejected') {
      return res.status(403).json({ error: 'Driver account has been rejected' });
    }

    res.json({
      approval_status: user.approval_status,
      ...issueTokens(user),
    });
  } catch (error) {
    console.error('[auth/login]', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;
  try {
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const access_token = jwt.sign(
      { id: payload.id, role: payload.role, username: payload.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    res.json({ access_token });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
