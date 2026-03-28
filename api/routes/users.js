import { Router } from 'express';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/pending-drivers', requireAdmin, async (_req, res) => {
  const drivers = await User.find({ role: 'driver', approval_status: 'pending' })
    .select('_id name username role approval_status vehicle wallet_address created_at')
    .sort({ created_at: -1 });

  res.json(drivers);
});

router.patch('/:id/approve', requireAdmin, async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'driver' },
    { approval_status: 'approved' },
    { new: true },
  ).select('_id name username role approval_status vehicle wallet_address created_at');

  if (!user) return res.status(404).json({ error: 'Driver not found' });
  res.json(user);
});

router.patch('/:id/reject', requireAdmin, async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'driver' },
    { approval_status: 'rejected' },
    { new: true },
  ).select('_id name username role approval_status vehicle wallet_address created_at');

  if (!user) return res.status(404).json({ error: 'Driver not found' });
  res.json(user);
});

export default router;
