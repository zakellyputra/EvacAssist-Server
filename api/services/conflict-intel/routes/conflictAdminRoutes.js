import { Router } from 'express';
import { requireAdmin } from '../../../middleware/auth.js';
import ConflictEvent from '../models/ConflictEvent.js';
import ConflictZone from '../models/ConflictZone.js';
import ConflictRawEvent from '../models/ConflictRawEvent.js';
import { bboxToPolygon, parseBBox } from '../utils/geospatial.js';
import buildZones from '../processors/buildZones.js';
import refreshConflictIntel from '../jobs/refreshConflictIntel.js';

const router = Router();

router.use(requireAdmin);

router.get('/events', async (req, res) => {
  const query = {};

  if (req.query.activeOnly !== 'false') {
    query.status = 'active';
    query.expiresAt = { $gt: new Date() };
  }
  if (req.query.category) query.category = req.query.category;
  if (req.query.country) query.country = req.query.country;
  if (req.query.hours) {
    const since = new Date(Date.now() - Number(req.query.hours) * 60 * 60 * 1000);
    query.reportedAt = { $gte: since };
  }

  const events = await ConflictEvent.find(query).sort({ reportedAt: -1 }).limit(250);
  res.json({ ok: true, events });
});

router.get('/zones', async (req, res) => {
  const query = {};
  if (req.query.activeOnly !== 'false') {
    query.status = { $in: ['active', 'overridden'] };
    query.activeUntil = { $gt: new Date() };
  }
  if (req.query.riskLevel) query.riskLevel = req.query.riskLevel;
  if (req.query.bbox) {
    query.geometry = {
      $geoIntersects: {
        $geometry: bboxToPolygon(parseBBox(req.query.bbox)),
      },
    };
  }

  const zones = await ConflictZone.find(query).sort({ score: -1, updatedAt: -1 }).limit(250);
  res.json({ ok: true, zones });
});

router.get('/zones/:zoneId', async (req, res) => {
  const zone = await ConflictZone.findOne({ zoneId: req.params.zoneId }).populate('basedOnEvents');
  if (!zone) return res.status(404).json({ error: 'Conflict zone not found' });

  const rawRecordIds = [...new Set(zone.basedOnEvents.flatMap((event) => event.sourceRecords.map(String)))];
  const rawRecords = await ConflictRawEvent.find({ _id: { $in: rawRecordIds } });
  const sourceSummary = rawRecords.reduce((acc, record) => {
    acc[record.source] = (acc[record.source] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    ok: true,
    zone,
    sourceSummary,
    contributingEvents: zone.basedOnEvents,
  });
});

router.post('/rebuild-zones', async (_req, res) => {
  const result = await buildZones();
  res.json({ ok: true, result });
});

router.post('/refresh', async (_req, res) => {
  const result = await refreshConflictIntel();
  res.json(result);
});

router.post('/zones/:zoneId/override', async (req, res) => {
  const { status, recommendedAction, overrideReason = '' } = req.body ?? {};
  const zone = await ConflictZone.findOne({ zoneId: req.params.zoneId });
  if (!zone) return res.status(404).json({ error: 'Conflict zone not found' });

  if (status && !['active', 'expired', 'overridden'].includes(status)) {
    return res.status(400).json({ error: 'status must be active, expired, or overridden' });
  }

  if (recommendedAction && !['allow', 'caution', 'reroute_preferred', 'avoid'].includes(recommendedAction)) {
    return res.status(400).json({ error: 'recommendedAction is invalid' });
  }

  zone.status = status ?? 'overridden';
  zone.recommendedAction = recommendedAction ?? zone.recommendedAction;
  zone.overrideReason = overrideReason;
  await zone.save();

  res.json({ ok: true, zone });
});

export default router;
