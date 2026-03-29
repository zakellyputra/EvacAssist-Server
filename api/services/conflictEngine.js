import Conflict from '../models/Conflict.js';
import Driver from '../models/Driver.js';
import EvacuationRequest from '../models/EvacuationRequest.js';
import Incident from '../models/Incident.js';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';

const ACTIVE_TRIP_STATUSES = [
  'pending',
  'accepted',
  'planned',
  'driver_assigned',
  'driver_en_route',
  'arrived_pickup',
  'passenger_verified',
  'in_progress',
  'in_transit',
  'rerouted',
];

function isActiveTripStatus(status) {
  return ACTIVE_TRIP_STATUSES.includes(status);
}

function normalizeIncidentSeverity(incident) {
  if (typeof incident?.severity === 'string') return incident.severity;
  if (typeof incident?.severity === 'number') {
    if (incident.severity >= 0.85) return 'critical';
    if (incident.severity >= 0.65) return 'high';
    if (incident.severity >= 0.35) return 'medium';
    return 'low';
  }
  return 'low';
}

function buildConflictKey(type, refs = {}) {
  return [
    type,
    refs.tripId || 'none',
    refs.requestId || 'none',
    refs.driverId || 'none',
    refs.vehicleId || 'none',
    refs.alertId || 'none',
    refs.scope || 'default',
  ].join(':');
}

function makeConflict({
  type,
  severity,
  blocking,
  message,
  tripId = null,
  requestId = null,
  driverId = null,
  vehicleId = null,
  alertId = null,
  details = {},
  scope = 'default',
}) {
  return {
    conflictKey: buildConflictKey(type, {
      tripId,
      requestId,
      driverId,
      vehicleId,
      alertId,
      scope,
    }),
    type,
    severity,
    blocking,
    message,
    tripId,
    requestId,
    driverId,
    vehicleId,
    alertId,
    details,
  };
}

async function getRideGroupContext(tripId) {
  const trip = await Trip.findById(tripId).lean();
  if (!trip) return null;

  const request = trip.requestId
    ? await EvacuationRequest.findById(trip.requestId).lean()
    : null;
  const driver = trip.driverUserId
    ? await Driver.findOne({ userId: trip.driverUserId }).lean()
    : null;
  const vehicle = trip.vehicleId
    ? await Vehicle.findById(trip.vehicleId).lean()
    : null;
  const activeAlerts = await Incident.find({
    tripId: trip._id,
    isActive: true,
    $or: [
      { resolvedAt: null },
      { resolvedAt: { $exists: false } },
    ],
  }).lean();

  return { trip, request, driver, vehicle, activeAlerts };
}

export async function detectDriverConflicts(driverId, tripId) {
  if (!driverId) return [];

  const activeTrips = await Trip.find({
    _id: { $ne: tripId },
    driverUserId: driverId,
    status: { $in: ACTIVE_TRIP_STATUSES },
  }).lean();

  if (!activeTrips.length) return [];

  const currentTrip = await Trip.findById(tripId).lean();
  return [
    makeConflict({
      type: 'DRIVER_DOUBLE_BOOKED',
      severity: 'high',
      blocking: true,
      message: 'Driver is already assigned to another active ride group.',
      tripId,
      requestId: currentTrip?.requestId ?? null,
      driverId,
      details: {
        conflictingTripIds: activeTrips.map((trip) => String(trip._id)),
      },
    }),
  ];
}

export async function detectVehicleConflicts(vehicleId, tripId) {
  if (!vehicleId) return [];

  const activeTrips = await Trip.find({
    _id: { $ne: tripId },
    vehicleId,
    status: { $in: ACTIVE_TRIP_STATUSES },
  }).lean();

  if (!activeTrips.length) return [];

  const currentTrip = await Trip.findById(tripId).lean();
  return [
    makeConflict({
      type: 'VEHICLE_DOUBLE_BOOKED',
      severity: 'high',
      blocking: true,
      message: 'Vehicle is already allocated to another active ride group.',
      tripId,
      requestId: currentTrip?.requestId ?? null,
      vehicleId,
      details: {
        conflictingTripIds: activeTrips.map((trip) => String(trip._id)),
      },
    }),
  ];
}

export async function detectCapacityConflicts(tripId) {
  const context = await getRideGroupContext(tripId);
  if (!context) return [];

  const riderCount = context.request?.peopleCount ?? context.trip.passengers ?? 0;
  const capacity = context.vehicle?.seatCapacity ?? context.driver?.capacityOverride ?? null;
  if (!capacity) return [];

  const conflicts = [];
  if (riderCount > capacity) {
    conflicts.push(makeConflict({
      type: 'RIDE_OVER_CAPACITY',
      severity: 'critical',
      blocking: true,
      message: 'Ride group exceeds available capacity.',
      tripId,
      requestId: context.request?._id ?? null,
      vehicleId: context.vehicle?._id ?? null,
      details: { riderCount, capacity },
    }));
  } else if (riderCount === capacity) {
    conflicts.push(makeConflict({
      type: 'RIDE_FULL',
      severity: 'medium',
      blocking: false,
      message: 'Ride group has reached full capacity.',
      tripId,
      requestId: context.request?._id ?? null,
      vehicleId: context.vehicle?._id ?? null,
      details: { riderCount, capacity },
    }));
  }

  return conflicts;
}

export async function detectAlertBlockerConflicts(tripId) {
  const context = await getRideGroupContext(tripId);
  if (!context) return [];

  return context.activeAlerts
    .filter((incident) => normalizeIncidentSeverity(incident) === 'critical')
    .map((incident) => makeConflict({
      type: 'CRITICAL_ALERT_ACTIVE',
      severity: 'critical',
      blocking: true,
      message: 'A critical unresolved alert is attached to this ride group.',
      tripId,
      requestId: context.request?._id ?? null,
      alertId: incident._id,
      details: {
        title: incident.title ?? null,
        description: incident.description ?? null,
      },
      scope: String(incident._id),
    }));
}

export async function detectReadinessConflicts(tripId) {
  const context = await getRideGroupContext(tripId);
  if (!context) return [];

  const checks = context.trip.readinessChecks ?? {};
  const driverAssigned = Boolean(context.trip.driverUserId);
  const vehicleAssigned = Boolean(context.trip.vehicleId);
  const alertsCleared = checks.alertsCleared ?? context.activeAlerts.every((alert) => normalizeIncidentSeverity(alert) !== 'critical');
  const operatorReviewed = checks.operatorReviewed ?? false;

  const missing = [];
  if (!driverAssigned) missing.push('driver assignment');
  if (!vehicleAssigned) missing.push('vehicle assignment');
  if (!alertsCleared) missing.push('critical alert clearance');
  if (!operatorReviewed) missing.push('operator review');

  if (!missing.length) return [];

  return [
    makeConflict({
      type: 'READINESS_BLOCKED',
      severity: 'high',
      blocking: true,
      message: 'Ride group readiness is blocked by incomplete operational checks.',
      tripId,
      requestId: context.request?._id ?? null,
      driverId: context.driver?._id ?? null,
      vehicleId: context.vehicle?._id ?? null,
      details: {
        missingChecks: missing,
        readinessChecks: checks,
      },
    }),
  ];
}

export async function detectDispatchStateConflicts(tripId) {
  const context = await getRideGroupContext(tripId);
  if (!context) return [];

  const conflicts = [];
  const dispatchReady = Boolean(context.trip.dispatchReadyAt);
  const invalidDispatchReady =
    dispatchReady
    && (!context.trip.driverUserId
      || !context.trip.vehicleId
      || context.activeAlerts.some((alert) => normalizeIncidentSeverity(alert) === 'critical'));

  if (invalidDispatchReady) {
    conflicts.push(makeConflict({
      type: 'DISPATCH_STATE_INVALID',
      severity: 'critical',
      blocking: true,
      message: 'Dispatch-ready state is invalid for the current ride-group conditions.',
      tripId,
      requestId: context.request?._id ?? null,
      driverId: context.driver?._id ?? null,
      vehicleId: context.vehicle?._id ?? null,
      details: {
        status: context.trip.status,
        dispatchReadyAt: context.trip.dispatchReadyAt,
      },
    }));
  }

  const invalidInTransit =
    ['driver_en_route', 'arrived_pickup', 'passenger_verified', 'in_transit'].includes(context.trip.status)
    && !context.trip.driverUserId;

  if (invalidInTransit) {
    conflicts.push(makeConflict({
      type: 'DISPATCH_STATE_INVALID',
      severity: 'critical',
      blocking: true,
      message: 'Trip lifecycle state is invalid because no driver is attached.',
      tripId,
      requestId: context.request?._id ?? null,
      details: {
        status: context.trip.status,
      },
      scope: `status:${context.trip.status}`,
    }));
  }

  return conflicts;
}

export async function detectRideGroupConflicts(tripId) {
  const context = await getRideGroupContext(tripId);
  if (!context) return [];

  const [driverConflicts, vehicleConflicts, capacityConflicts, readinessConflicts, alertConflicts, dispatchStateConflicts] = await Promise.all([
    detectDriverConflicts(context.trip.driverUserId, tripId),
    detectVehicleConflicts(context.trip.vehicleId, tripId),
    detectCapacityConflicts(tripId),
    detectReadinessConflicts(tripId),
    detectAlertBlockerConflicts(tripId),
    detectDispatchStateConflicts(tripId),
  ]);

  return [
    ...driverConflicts,
    ...vehicleConflicts,
    ...capacityConflicts,
    ...readinessConflicts,
    ...alertConflicts,
    ...dispatchStateConflicts,
  ];
}

export async function syncRideGroupConflicts(tripId) {
  const detectedConflicts = await detectRideGroupConflicts(tripId);
  const activeKeys = detectedConflicts.map((conflict) => conflict.conflictKey);

  await Promise.all(detectedConflicts.map((conflict) => (
    Conflict.findOneAndUpdate(
      { conflictKey: conflict.conflictKey, status: 'active' },
      {
        $set: {
          ...conflict,
          detectedAt: new Date(),
          resolvedAt: null,
          resolvedBy: null,
          resolutionNote: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  )));

  await Conflict.updateMany(
    {
      tripId,
      status: 'active',
      conflictKey: { $nin: activeKeys },
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    }
  );

  return Conflict.find({ tripId }).sort({ detectedAt: -1 });
}

export async function getActiveBlockingConflicts(tripId) {
  const conflicts = await syncRideGroupConflicts(tripId);
  return conflicts.filter((conflict) => conflict.status === 'active' && conflict.blocking);
}

export function buildConflictErrorResponse(conflicts, message = null) {
  const primary = conflicts[0];
  return {
    ok: false,
    code: primary?.type ?? 'CONFLICT_DETECTED',
    message: message ?? primary?.message ?? 'A blocking operational conflict prevented this action.',
    conflicts: conflicts.map((conflict) => ({
      id: conflict._id ?? null,
      type: conflict.type,
      severity: conflict.severity,
      blocking: conflict.blocking,
      tripId: conflict.tripId,
      requestId: conflict.requestId,
      driverId: conflict.driverId,
      vehicleId: conflict.vehicleId,
      alertId: conflict.alertId,
      message: conflict.message,
      details: conflict.details,
      status: conflict.status ?? 'active',
    })),
  };
}

