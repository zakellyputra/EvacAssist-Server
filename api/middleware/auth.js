import jwt from 'jsonwebtoken';
import TokenBlacklist from '../models/TokenBlacklist.js';

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// New access control functions
export function requireCoordinatorOrAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'coordinator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Coordinator or admin access required' });
    }
    next();
  });
}

export function requireIncidentReader(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'driver' && req.user.role !== 'coordinator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Incident access denied' });
    }
    next();
  });
}

// Basic token blacklist check
export async function checkTokenBlacklist(jti) {
  const blacklisted = await TokenBlacklist.findOne({ jti });
  return !!blacklisted;
}
