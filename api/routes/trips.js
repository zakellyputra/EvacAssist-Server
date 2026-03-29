import { Router } from 'express';
import crypto from 'crypto';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import Driver from '../models/Driver.js';
import EvacuationRequest from '../models/EvacuationRequest.js';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import { io } from '../server.js';
import {
  buildConflictErrorResponse,
  detectDriverConflicts,
  detectVehicleConflicts,
  getActiveBlockingConflicts,
  syncRideGroupConflicts,
} from '../services/conflictEngine.js';

const router = Router();

async function logAuditEvent({ actorId, tripId, eventType, payload = {} }) {
  await AuditLog.create({
    actor_id: actorId,
    trip_id: tripId,
    event_type: eventType,
    payload,
  });
}

async function syncRequestAssignments(trip) {
  if (!trip?.requestId) return null;
  return EvacuationRequest.findByIdAndUpdate(
    trip.requestId,
    {
      assignedTripId: trip._id,
      assignedDriverUserId: trip.driverUserId ?? null,
      assignedVehicleId: trip.vehicleId ?? null,
      status: trip.status === 'cancelled' ? 'cancelled' : (trip.driverUserId ? 'assigned' : 'reviewing'),
    },
    { new: true }
  );
}

// POST /api/trips — create evacuation request
router.post('/', requireAuth, async (req, res) => {
  const { pickup_loc, dropoff_loc, passengers, accessibility_needs, notes } = req.body;

  // Generate one-time QR token — store only the hash
  const plainToken = crypto.randomBytes(32).toString('base64');
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

  const trip = await Trip.create({
    rider_id: req.user.id,
    driverUserId: null,
    pickup_loc,
    dropoff_loc,
    passengers,
    accessibility_needs,
    notes,
    qr_token_hash: tokenHash,
    status: 'pending',
  });
  await syncRideGroupConflicts(trip._id);

  // Broadcast to nearby drivers via Socket.io
  io.emit('new_request', {
    trip_id: trip._id,
    pickup_loc,
    passengers,
    notes,
  });

  // Return plaintext token to rider only — never stored again
  res.status(201).json({ trip, qr_token: plainToken });
});

// GET /api/trips/available — open requests near driver
router.get('/available', requireAuth, async (req, res) => {
  const { lat, lng, radius_km = 10 } = req.query;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const radiusKmNum = Number(radius_km);

  const query = { status: 'pending' };
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    query.pickup_loc = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
        $maxDistance: (Number.isFinite(radiusKmNum) ? radiusKmNum : 10) * 1000,
      },
    };
  }

  const trips = await Trip.find(query).sort({ created_at: -1 }).limit(20);
  res.json(trips);
});

// PATCH /api/trips/:id/accept
router.patch('/:id/accept', requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { driver_id: req.user.id, driverUserId: req.user.id, status: 'accepted' },
    { new: true }
  );
  if (!trip) return res.status(409).json({ error: 'Trip already taken or not found' });

  await syncRideGroupConflicts(trip._id);
  io.emit('trip_accepted', { trip_id: trip._id, driver_id: req.user.id });
  res.json(trip);
});

// PATCH /api/trips/:id/release
router.patch('/:id/release', requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, driver_id: req.user.id, status: 'accepted' },
    { driver_id: null, driverUserId: null, status: 'pending' },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found or not owned by driver' });
  await syncRideGroupConflicts(trip._id);
  res.json(trip);
});

// POST /api/trips/:id/verify — QR pickup verification
router.post('/:id/verify', requireAuth, async (req, res) => {
  const { token } = req.body;
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const submittedHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenAge = (Date.now() - trip.created_at.getTime()) / 60_000; // minutes

  if (submittedHash !== trip.qr_token_hash) {
    return res.status(403).json({ error: 'Invalid QR token' });
  }
  if (tokenAge > 5) {
    return res.status(403).json({ error: 'QR token expired (5-minute window)' });
  }

  trip.status = 'in_progress';
  await trip.save();
  await syncRideGroupConflicts(trip._id);

  io.emit('trip_verified', { trip_id: trip._id });
  res.json({ success: true, trip });
});

// PATCH /api/trips/:id/complete
router.patch('/:id/complete', requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: 'in_progress' },
    { status: 'completed' },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not in progress' });

  await syncRideGroupConflicts(trip._id);
  io.emit('trip_completed', { trip_id: trip._id });
  res.json(trip);
});

// GET /api/trips/:id/conflicts
router.get('/:id/conflicts', requireAdmin, async (req, res) => {
  const trip = await Trip.findById(req.params.id).lean();
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const conflicts = await syncRideGroupConflicts(trip._id);
  res.json({ ok: true, trip_id: trip._id, conflicts });
});

// PATCH /api/trips/:id/assign-driver
router.patch('/:id/assign-driver', requireAdmin, async (req, res) => {
  const { driverUserId } = req.body;
  if (!driverUserId) return res.status(400).json({ error: 'driverUserId is required' });

  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const preConflicts = await detectDriverConflicts(driverUserId, trip._id);
  if (preConflicts.length) {
    return res.status(409).json(buildConflictErrorResponse(preConflicts));
  }

  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) return res.status(404).json({ error: 'Driver record not found' });

  trip.driverUserId = driverUserId;
  trip.driver_id = driverUserId;
  if (trip.status === 'pending') trip.status = 'driver_assigned';
  trip.readinessChecks = {
    ...trip.readinessChecks,
    driverAssigned: true,
  };
  await trip.save();

  await Driver.findByIdAndUpdate(driver._id, { status: 'assigned' });
  await syncRequestAssignments(trip);
  const conflicts = await syncRideGroupConflicts(trip._id);
  await logAuditEvent({
    actorId: req.user.id,
    tripId: trip._id,
    eventType: 'driver_assigned',
    payload: { driverUserId },
  });

  res.json({ ok: true, trip, conflicts });
});

// PATCH /api/trips/:id/assign-vehicle
router.patch('/:id/assign-vehicle', requireAdmin, async (req, res) => {
  const { vehicleId } = req.body;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId is required' });

  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const preConflicts = await detectVehicleConflicts(vehicleId, trip._id);
  if (preConflicts.length) {
    return res.status(409).json(buildConflictErrorResponse(preConflicts));
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  trip.vehicleId = vehicleId;
  trip.readinessChecks = {
    ...trip.readinessChecks,
    vehicleAssigned: true,
  };
  await trip.save();

  await syncRequestAssignments(trip);
  const conflicts = await syncRideGroupConflicts(trip._id);
  await logAuditEvent({
    actorId: req.user.id,
    tripId: trip._id,
    eventType: 'vehicle_assigned',
    payload: { vehicleId },
  });

  res.json({ ok: true, trip, conflicts });
});

// PATCH /api/trips/:id/readiness
router.patch('/:id/readiness', requireAdmin, async (req, res) => {
  const { readinessChecks = {} } = req.body;
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  trip.readinessChecks = {
    ...trip.readinessChecks,
    ...readinessChecks,
  };
  await trip.save();

  const conflicts = await syncRideGroupConflicts(trip._id);
  await logAuditEvent({
    actorId: req.user.id,
    tripId: trip._id,
    eventType: 'readiness_updated',
    payload: { readinessChecks },
  });

  res.json({ ok: true, trip, conflicts });
});

// PATCH /api/trips/:id/dispatch-ready
router.patch('/:id/dispatch-ready', requireAdmin, async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const conflicts = await getActiveBlockingConflicts(trip._id);
  if (conflicts.length) {
    return res.status(409).json(buildConflictErrorResponse(conflicts, 'Trip cannot be marked dispatch ready while blocking conflicts are active.'));
  }

  trip.dispatchReadyAt = new Date();
  trip.dispatchReadyByUserId = req.user.id;
  if (trip.status === 'planned' || trip.status === 'pending' || trip.status === 'accepted') {
    trip.status = 'driver_assigned';
  }
  await trip.save();

  await logAuditEvent({
    actorId: req.user.id,
    tripId: trip._id,
    eventType: 'dispatch_ready_marked',
    payload: { dispatchReadyAt: trip.dispatchReadyAt },
  });

  res.json({ ok: true, trip, conflicts: await syncRideGroupConflicts(trip._id) });
});

router.patch('/:id/close-joining', requireAdmin, async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    { joiningClosed: true },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  await logAuditEvent({ actorId: req.user.id, tripId: trip._id, eventType: 'joining_closed' });
  res.json({ ok: true, trip, conflicts: await syncRideGroupConflicts(trip._id) });
});

router.patch('/:id/reopen', requireAdmin, async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    { joiningClosed: false, status: tripStatusForReopenQuery() },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  await logAuditEvent({ actorId: req.user.id, tripId: trip._id, eventType: 'ride_reopened' });
  res.json({ ok: true, trip, conflicts: await syncRideGroupConflicts(trip._id) });
});

router.patch('/:id/cancel', requireAdmin, async (req, res) => {
  const { reason = '' } = req.body;
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled', cancellationReason: reason },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  await syncRequestAssignments(trip);
  await logAuditEvent({ actorId: req.user.id, tripId: trip._id, eventType: 'ride_cancelled', payload: { reason } });
  res.json({ ok: true, trip, conflicts: await syncRideGroupConflicts(trip._id) });
});

// GET /api/trips/my
router.get('/my', requireAuth, async (req, res) => {
  const filter = req.user.role === 'driver'
    ? { driver_id: req.user.id }
    : { rider_id: req.user.id };
  const trips = await Trip.find(filter).sort({ created_at: -1 }).limit(50);
  res.json(trips);
});

export default router;

function tripStatusForReopenQuery() {
  return 'planned';
}
