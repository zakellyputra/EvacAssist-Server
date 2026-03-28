import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import Trip from '../models/Trip.js';
import { io } from '../server.js';

const router = Router();

// POST /api/trips — create evacuation request
router.post('/', requireAuth, async (req, res) => {
  const { pickup_loc, dropoff_loc, passengers, accessibility_needs, notes } = req.body;

  // Generate one-time QR token — store only the hash
  const plainToken = crypto.randomBytes(32).toString('base64');
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

  const trip = await Trip.create({
    rider_id: req.user.id,
    pickup_loc,
    dropoff_loc,
    passengers,
    accessibility_needs,
    notes,
    qr_token_hash: tokenHash,
    status: 'pending',
  });

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
  const trips = await Trip.find({
    status: 'pending',
    pickup_loc: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius_km) * 1000,
      },
    },
  }).limit(20);
  res.json(trips);
});

// PATCH /api/trips/:id/accept
router.patch('/:id/accept', requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { driver_id: req.user.id, status: 'accepted' },
    { new: true }
  );
  if (!trip) return res.status(409).json({ error: 'Trip already taken or not found' });

  io.emit('trip_accepted', { trip_id: trip._id, driver_id: req.user.id });
  res.json(trip);
});

// PATCH /api/trips/:id/release
router.patch('/:id/release', requireAuth, async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, driver_id: req.user.id, status: 'accepted' },
    { driver_id: null, status: 'pending' },
    { new: true }
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found or not owned by driver' });
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

  io.emit('trip_completed', { trip_id: trip._id });
  res.json(trip);
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
