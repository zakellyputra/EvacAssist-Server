import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import RiskZone from '../models/RiskZone.js';

const router = Router();

const FALLBACK_TEST_ZONES = [
  {
    _id: 'fallback-zone-1',
    name: 'Test Conflict Zone Alpha',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-86.182, 39.781],
        [-86.165, 39.781],
        [-86.165, 39.767],
        [-86.182, 39.767],
        [-86.182, 39.781],
      ]],
    },
    risk_level: 'critical',
    source: 'test_fallback',
    updated_at: new Date('2026-03-29T00:00:00.000Z'),
  },
  {
    _id: 'fallback-zone-2',
    name: 'Test Conflict Zone Bravo',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-86.157, 39.764],
        [-86.14, 39.764],
        [-86.14, 39.75],
        [-86.157, 39.75],
        [-86.157, 39.764],
      ]],
    },
    risk_level: 'high',
    source: 'test_fallback',
    updated_at: new Date('2026-03-29T00:00:00.000Z'),
  },
];

async function getZonesOrFallback() {
  const zones = await RiskZone.find().sort({ updated_at: -1 }).lean();
  return zones.length ? zones : FALLBACK_TEST_ZONES;
}

router.get('/public', async (_req, res) => {
  res.json(await getZonesOrFallback());
});

// GET /api/zones (JWT)
router.get('/', requireAuth, async (_req, res) => {
  res.json(await getZonesOrFallback());
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
