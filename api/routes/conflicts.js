import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import Conflict from '../models/Conflict.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  const {
    tripId,
    status = 'active',
    blocking,
  } = req.query;

  const query = {};
  if (tripId) query.tripId = tripId;
  if (status) query.status = status;
  if (blocking === 'true') query.blocking = true;
  if (blocking === 'false') query.blocking = false;

  const conflicts = await Conflict.find(query).sort({ detectedAt: -1 }).limit(200);
  res.json({ ok: true, conflicts });
});

router.get('/ride-groups/:tripId', requireAdmin, async (req, res) => {
  const conflicts = await Conflict.find({ tripId: req.params.tripId }).sort({ detectedAt: -1 });
  res.json({ ok: true, tripId: req.params.tripId, conflicts });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const conflict = await Conflict.findById(req.params.id);
  if (!conflict) return res.status(404).json({ error: 'Conflict not found' });
  res.json({ ok: true, conflict });
});

router.post('/:id/resolve', requireAdmin, async (req, res) => {
  const { note = '' } = req.body;
  const conflict = await Conflict.findById(req.params.id);
  if (!conflict) return res.status(404).json({ error: 'Conflict not found' });

  conflict.status = 'resolved';
  conflict.resolvedAt = new Date();
  conflict.resolvedBy = req.user.id;
  conflict.resolutionNote = note;
  await conflict.save();

  await AuditLog.create({
    actor_id: req.user.id,
    trip_id: conflict.tripId ?? null,
    event_type: 'conflict_resolved',
    payload: {
      conflictId: conflict._id,
      type: conflict.type,
      note,
    },
  });

  res.json({ ok: true, conflict });
});

export default router;
