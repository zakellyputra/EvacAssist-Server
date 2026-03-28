import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { suggestRoutes } from '../services/routeEngine.js';

const router = Router();

// POST /api/routes/suggest — get AI-scored route options
router.post('/suggest', requireAuth, async (req, res) => {
  const { origin, destination } = req.body;
  // origin / destination: { lat, lng }
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return res.status(400).json({ error: 'origin and destination with lat/lng required' });
  }

  const routes = await suggestRoutes(
    [origin.lng, origin.lat],
    [destination.lng, destination.lat]
  );

  res.json({ routes });
});

export default router;
