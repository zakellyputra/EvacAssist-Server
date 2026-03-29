import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { parseTextReport, SOURCE_WEIGHTS } from '../services/llmParser.js';
import { parseImage } from '../services/vlmParser.js';
import { fuseIncident } from '../services/geoFusion.js';
import Incident from '../models/Incident.js';
import RawReport from '../models/RawReport.js';
import { requireAdmin } from '../middleware/auth.js';
import { syncRideGroupConflicts } from '../services/conflictEngine.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

async function listActiveIncidents(limit = 100) {
  return Incident.find({ expires_at: { $gt: new Date() } })
    .sort({ created_at: -1 })
    .limit(limit);
}

router.post('/text', requireAuth, async (req, res) => {
  const { text, source_type = 'user_report' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const raw = await RawReport.create({ type: 'text', content: text, submitted_by: req.user.id });
  const parsed = await parseTextReport(text, SOURCE_WEIGHTS[source_type] ?? SOURCE_WEIGHTS.user_report);
  if (!parsed.coordinates) {
    return res.status(422).json({ error: 'Could not resolve coordinates from report', parsed });
  }

  const incident = await Incident.create({
    ...parsed,
    raw_report_id: raw._id,
  });

  fuseIncident({ ...incident.toObject(), ...parsed }).catch(console.error);

  res.status(201).json({ incident_id: incident._id, parsed });
});

router.post('/image', requireAuth, upload.single('image'), async (req, res) => {
  const { lat, lng } = req.body;
  if (!req.file) return res.status(400).json({ error: 'image file required' });
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const imageBase64 = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;

  const raw = await RawReport.create({
    type: 'image',
    image_url: `data:${mediaType};base64,${imageBase64.slice(0, 64)}...`,
    submitted_by: req.user.id,
  });

  const parsed = await parseImage(imageBase64, mediaType, { lat: parseFloat(lat), lng: parseFloat(lng) });
  const incident = await Incident.create({
    ...parsed,
    location: { type: 'Point', coordinates: [parsed.coordinates.lng, parsed.coordinates.lat] },
    raw_report_id: raw._id,
  });

  fuseIncident({ ...incident.toObject(), ...parsed }).catch(console.error);

  res.status(201).json({ incident_id: incident._id, parsed });
});

router.get('/public', async (_req, res) => {
  res.json(await listActiveIncidents(50));
});

router.get('/', requireAuth, async (_req, res) => {
  res.json(await listActiveIncidents());
});

router.patch('/:id/resolve', requireAdmin, async (req, res) => {
  const incident = await Incident.findByIdAndUpdate(
    req.params.id,
    {
      isActive: false,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const conflicts = incident.tripId ? await syncRideGroupConflicts(incident.tripId) : [];
  res.json({ ok: true, incident, conflicts });
});

router.patch('/:id/escalate', requireAdmin, async (req, res) => {
  const incident = await Incident.findByIdAndUpdate(
    req.params.id,
    {
      isActive: true,
      resolvedAt: null,
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const conflicts = incident.tripId ? await syncRideGroupConflicts(incident.tripId) : [];
  res.json({ ok: true, incident, conflicts });
});

export default router;
