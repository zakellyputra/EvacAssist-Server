import { Router } from 'express';
import ConflictRawEvent from '../models/ConflictRawEvent.js';
import { checkPointRisk, checkRouteRisk, getActiveZones, buildGeoJsonZonePayload } from '../processors/routeRisk.js';
import ConflictZone from '../models/ConflictZone.js';

const router = Router();

const FALLBACK_CONFLICT_ZONES = [
  {
    zoneId: 'fallback-conflict-zone-1',
    zoneType: 'active_conflict',
    riskLevel: 'red',
    score: 0.92,
    confidence: 0.86,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-86.176, 39.779],
        [-86.162, 39.779],
        [-86.162, 39.767],
        [-86.176, 39.767],
        [-86.176, 39.779],
      ]],
    },
    centroid: { type: 'Point', coordinates: [-86.169, 39.773] },
    recommendedAction: 'avoid',
    activeUntil: new Date('2026-04-02T00:00:00.000Z'),
  },
  {
    zoneId: 'fallback-conflict-zone-2',
    zoneType: 'route_disruption',
    riskLevel: 'orange',
    score: 0.74,
    confidence: 0.8,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-86.151, 39.764],
        [-86.138, 39.764],
        [-86.138, 39.753],
        [-86.151, 39.753],
        [-86.151, 39.764],
      ]],
    },
    centroid: { type: 'Point', coordinates: [-86.1445, 39.7585] },
    recommendedAction: 'reroute',
    activeUntil: new Date('2026-04-02T00:00:00.000Z'),
  },
];

router.get('/zones', async (req, res) => {
  const liveZones = await getActiveZones({ bbox: req.query.bbox ?? null });
  const zones = liveZones.length ? liveZones : FALLBACK_CONFLICT_ZONES;
  res.json({
    ok: true,
    zones: zones.map((zone) => ({
      zoneId: zone.zoneId,
      zoneType: zone.zoneType,
      riskLevel: zone.riskLevel,
      score: zone.score,
      confidence: zone.confidence,
      geometry: zone.geometry,
      centroid: zone.centroid,
      recommendedAction: zone.recommendedAction,
      activeUntil: zone.activeUntil,
    })),
    geojson: buildGeoJsonZonePayload(zones),
  });
});

router.get('/check-point', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numeric query params' });
  }

  const result = await checkPointRisk({ lat, lng });
  res.json({ ok: true, ...result });
});

router.post('/check-route', async (req, res) => {
  const { route, tripId = null } = req.body ?? {};
  if (!route) {
    return res.status(400).json({ error: 'route is required' });
  }

  const result = await checkRouteRisk({ route, tripId });
  res.json({ ok: true, ...result });
});

router.get('/summary', async (_req, res) => {
  const [zones, latestRaw] = await Promise.all([
    ConflictZone.find({
      status: { $in: ['active', 'overridden'] },
      activeUntil: { $gt: new Date() },
    }).lean(),
    ConflictRawEvent.findOne().sort({ fetchedAt: -1 }).lean(),
  ]);

  const counts = zones.reduce((acc, zone) => {
    acc[zone.riskLevel] = (acc[zone.riskLevel] ?? 0) + 1;
    return acc;
  }, { green: 0, yellow: 0, orange: 0, red: 0 });

  res.json({
    ok: true,
    totalActiveZones: zones.length,
    countsByRiskLevel: counts,
    latestRefreshTimestamp: latestRaw?.fetchedAt ?? null,
  });
});

export default router;
