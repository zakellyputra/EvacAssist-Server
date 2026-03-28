import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import RoadSegment from '../models/RoadSegment.js';
import EdgeRisk from '../models/EdgeRisk.js';
import { scoreEdge } from '../services/edgeScorer.js';

const router = Router();

// GET /api/edges/scores?bbox=minLng,minLat,maxLng,maxLat
// Returns edge scores for map rendering within a bounding box
router.get('/scores', requireAuth, async (req, res) => {
  const { bbox } = req.query;
  if (!bbox) return res.status(400).json({ error: 'bbox required (minLng,minLat,maxLng,maxLat)' });

  const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);

  const segments = await RoadSegment.find({
    geometry: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat], [maxLng, minLat],
            [maxLng, maxLat], [minLng, maxLat],
            [minLng, minLat],
          ]],
        },
      },
    },
  }).limit(2000);

  const segmentIds = segments.map((s) => s._id);
  const risks = await EdgeRisk.find({ segment_id: { $in: segmentIds } });
  const riskMap = new Map(risks.map((r) => [r.segment_id.toString(), r]));

  const features = segments.map((seg) => {
    const risk = riskMap.get(seg._id.toString()) ?? {};
    const { cost, isHardBlocked, multiplier } = scoreEdge(seg.base_cost, risk, risk.last_updated);
    return {
      type: 'Feature',
      geometry: seg.geometry,
      properties: {
        segment_id: seg._id,
        is_hard_blocked: isHardBlocked,
        risk_multiplier: multiplier,
        final_cost: cost === Infinity ? null : cost,
        confidence: risk.confidence ?? 0,
      },
    };
  });

  res.json({ type: 'FeatureCollection', features });
});

export default router;
