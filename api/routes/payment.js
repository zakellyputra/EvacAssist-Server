import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();

// GET /api/payment/:trip_id/qr — generate Solana Pay QR for driver
router.get('/:trip_id/qr', requireAuth, async (req, res) => {
  const trip = await Trip.findById(req.params.trip_id).populate('driver_id');
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const driver = await User.findById(trip.driver_id);
  if (!driver?.wallet_address) return res.status(400).json({ error: 'Driver has no wallet address' });

  // Construct Solana Pay URL: solana:<recipient>?amount=<suggested>&label=EvacAssist&reference=<trip_id>
  const suggestedSOL = 0.01;
  const solanaPayUrl = `solana:${driver.wallet_address}?amount=${suggestedSOL}&label=EvacAssist&reference=${trip._id}&memo=EvacAssist+Tip`;

  res.json({ solana_pay_url: solanaPayUrl, wallet: driver.wallet_address, suggested_sol: suggestedSOL });
});

// POST /api/payment/:trip_id/confirm — record transaction signature (non-custodial)
router.post('/:trip_id/confirm', requireAuth, async (req, res) => {
  const { signature } = req.body;
  if (!signature) return res.status(400).json({ error: 'signature required' });

  await Trip.findByIdAndUpdate(req.params.trip_id, { payment_sig: signature });
  await AuditLog.create({
    event_type: 'payment_confirmed',
    actor_id: req.user.id,
    trip_id: req.params.trip_id,
    payload: { signature },
  });

  res.json({ success: true });
});

export default router;
