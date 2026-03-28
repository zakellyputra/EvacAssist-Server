import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import RiskZone from '../models/RiskZone.js';

const router = Router();

// GET /api/zones (JWT)
router.get('/', requireAuth, async (_req, res) => {
  res.json(await RiskZone.find());
});

// GET /api/zones/check?lat=X&lng=Y — PUBLIC, no auth (guest emergency mode)
router.get('/check', async (req, res) => {
  const { lat, lng } = req.query;
  const zones = await RiskZone.find({
    geometry: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      },
    },
  });
  const highest = zones.reduce((max, z) => {
    const levels = { low: 1, moderate: 2, high: 3, critical: 4 };
    return (levels[z.risk_level] ?? 0) > (levels[max] ?? 0) ? z.risk_level : max;
  }, null);
  res.json({ risk_level: highest ?? 'none', zones });
});

// POST /api/zones (admin)
router.post('/', requireAdmin, async (req, res) => {
  const zone = await RiskZone.create(req.body);
  res.status(201).json(zone);
});

// DELETE /api/zones/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await RiskZone.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
