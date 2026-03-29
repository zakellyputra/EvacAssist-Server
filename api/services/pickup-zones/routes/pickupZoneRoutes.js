import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../../../middleware/auth.js';
import PickupZone from '../models/PickupZone.js';
import buildPickupZonePolygon from '../processors/buildPickupZonePolygon.js';
import generatePickupZones from '../processors/generatePickupZones.js';
import validatePickupZone from '../processors/validatePickupZone.js';
import { getActiveZones } from '../../conflict-intel/processors/routeRisk.js';

const router = Router();

function getPointCoordinates(input, label) {
  if (!Array.isArray(input) || input.length !== 2) {
    throw new Error(`${label} must be [lng, lat]`);
  }
  return input;
}

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { passengerLocation, searchRadiusMeters = 1000, requestId = null } = req.body ?? {};
    const result = await generatePickupZones({
      passengerLocation: getPointCoordinates(passengerLocation, 'passengerLocation'),
      searchRadiusMeters,
      requestId,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { point, zone } = req.body ?? {};
    const activeZones = await getActiveZones();

    if (point) {
      const coordinates = getPointCoordinates(point, 'point');
      const candidate = { coordinates };
      const polygon = buildPickupZonePolygon(candidate);
      const result = validatePickupZone({ candidate, polygon: polygon.geometry, activeZones });
      return res.json({ ok: true, ...result });
    }

    if (zone?.center) {
      const candidate = { coordinates: getPointCoordinates(zone.center, 'zone.center') };
      const polygon = zone.geometry ?? buildPickupZonePolygon(candidate).geometry;
      const result = validatePickupZone({ candidate, polygon, activeZones });
      return res.json({ ok: true, ...result });
    }

    return res.status(400).json({ error: 'point or zone is required' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const query = mongoose.Types.ObjectId.isValid(req.params.id)
    ? { $or: [{ pickupZoneId: req.params.id }, { _id: req.params.id }] }
    : { pickupZoneId: req.params.id };
  const pickupZone = await PickupZone.findOne(query);
  if (!pickupZone) return res.status(404).json({ error: 'Pickup zone not found' });
  res.json({ ok: true, pickupZone });
});

export default router;
