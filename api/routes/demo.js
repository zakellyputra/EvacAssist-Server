import { Router } from 'express';
import Conflict from '../models/Conflict.js';
import Driver from '../models/Driver.js';
import EvacuationRequest from '../models/EvacuationRequest.js';
import Incident from '../models/Incident.js';
import RiskZone from '../models/RiskZone.js';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import PickupZone from '../services/pickup-zones/models/PickupZone.js';
import ConflictZone from '../services/conflict-intel/models/ConflictZone.js';

const router = Router();

const CLOSED_TRIP_STATUSES = ['completed', 'cancelled', 'failed'];
const MOVING_TRIP_STATUSES = ['in_progress', 'in_transit', 'driver_en_route', 'arrived_pickup', 'passenger_verified'];
const WAITING_REQUEST_STATUSES = ['pending', 'reviewing', 'approved'];
const ACTIVE_DRIVER_STATUSES = ['available', 'assigned', 'en_route_pickup', 'transporting'];

function shortCode(id) {
  return String(id ?? '').slice(-4).toUpperCase() || '----';
}

function toObjectIdString(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : String(value);
}

function priorityToScore(priorityLevel) {
  switch (priorityLevel) {
    case 'critical':
      return 90;
    case 'high':
      return 70;
    case 'medium':
      return 45;
    case 'low':
      return 20;
    default:
      return 0;
  }
}

function tripStatusLabel(status) {
  switch (status) {
    case 'pending':
    case 'planned':
      return 'Open';
    case 'accepted':
    case 'driver_assigned':
      return 'Filling';
    case 'driver_en_route':
    case 'arrived_pickup':
    case 'passenger_verified':
    case 'in_progress':
    case 'in_transit':
      return 'En Route';
    case 'completed':
      return 'Completed';
    case 'cancelled':
    case 'failed':
      return 'Flagged';
    default:
      return 'Open';
  }
}

function buildZoneFeature(zone) {
  if (!zone?.geometry?.coordinates?.length) return null;

  const tone = ['high', 'critical'].includes(zone.risk_level) ? 'restricted' : 'warning';
  return {
    id: toObjectIdString(zone._id),
    name: zone.name,
    zone: zone.name,
    tone,
    cautionNote: `${zone.risk_level} risk zone`,
    geometry: {
      type: 'Feature',
      properties: {
        id: toObjectIdString(zone._id),
        tone,
      },
      geometry: zone.geometry,
    },
  };
}

function collectGeometryCoordinates(geometry) {
  if (!geometry?.type || !geometry?.coordinates) return [];
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'Polygon') return geometry.coordinates.flat(1);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}

function buildViewport(points) {
  const coordinates = points
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([lng, lat]) => [Number(lng), Number(lat)])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

  if (!coordinates.length) return null;

  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
    bounds: [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
  };
}

router.get('/operations-overview', async (_req, res) => {
  const now = new Date();

  const [
    trips,
    requests,
    drivers,
    vehicles,
    riskZones,
    activeConflicts,
    activeCriticalIncidents,
    pickupZones,
    activeConflictZones,
  ] = await Promise.all([
    Trip.find({ status: { $nin: CLOSED_TRIP_STATUSES } }).sort({ updated_at: -1 }).limit(200).lean(),
    EvacuationRequest.find({ status: { $nin: ['completed', 'cancelled', 'failed'] } }).sort({ updatedAt: -1 }).limit(200).lean(),
    Driver.find().sort({ updatedAt: -1 }).lean(),
    Vehicle.find({ isActive: true }).lean(),
    RiskZone.find().sort({ updated_at: -1 }).lean(),
    Conflict.find({ status: 'active' }).select('tripId blocking severity').lean(),
    Incident.countDocuments({ isActive: true, severity: { $gte: 0.7 } }),
    PickupZone.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(200).lean(),
    ConflictZone.countDocuments({ status: 'active', activeUntil: { $gt: now } }),
  ]);

  const requestById = new Map(requests.map((request) => [toObjectIdString(request._id), request]));
  const vehicleById = new Map(vehicles.map((vehicle) => [toObjectIdString(vehicle._id), vehicle]));
  const zoneById = new Map(riskZones.map((zone) => [toObjectIdString(zone._id), zone]));
  const driverByUserId = new Map(drivers.map((driver) => [toObjectIdString(driver.userId), driver]));

  const conflictCountsByTripId = new Map();
  const blockingTripIds = new Set();

  for (const conflict of activeConflicts) {
    const tripId = toObjectIdString(conflict.tripId);
    if (!tripId) continue;
    conflictCountsByTripId.set(tripId, (conflictCountsByTripId.get(tripId) ?? 0) + 1);
    if (conflict.blocking) blockingTripIds.add(tripId);
  }

  const activeTrips = trips.filter((trip) => !CLOSED_TRIP_STATUSES.includes(trip.status));
  const movingTrips = activeTrips.filter((trip) => MOVING_TRIP_STATUSES.includes(trip.status));
  const waitingRequests = requests.length
    ? requests.filter((request) => WAITING_REQUEST_STATUSES.includes(request.status) && !request.assignedDriverUserId)
    : activeTrips.filter((trip) => !trip.driverUserId);
  const activeDrivers = drivers.filter((driver) => ACTIVE_DRIVER_STATUSES.includes(driver.status));

  const tripMarkers = activeTrips
    .filter((trip) => Array.isArray(trip.pickup_loc?.coordinates) && trip.pickup_loc.coordinates.length === 2)
    .map((trip) => {
      const tripId = toObjectIdString(trip._id);
      const request = requestById.get(toObjectIdString(trip.requestId)) ?? null;
      const driver = driverByUserId.get(toObjectIdString(trip.driverUserId)) ?? null;
      const vehicle = vehicleById.get(toObjectIdString(trip.vehicleId)) ?? null;
      const zone = zoneById.get(toObjectIdString(request?.destinationZoneId)) ?? null;
      const groupId = `RG-${shortCode(tripId)}`;

      return {
        id: groupId,
        coordinates: trip.pickup_loc.coordinates,
        rideGroup: {
          id: groupId,
          tripId,
          requestId: toObjectIdString(trip.requestId),
          pickupPoint: zone?.name ? `${zone.name} pickup` : `Pickup ${shortCode(tripId)}`,
          pickupDetail: trip.pickupLocation
            ? `${Number(trip.pickupLocation.lat).toFixed(4)}, ${Number(trip.pickupLocation.lng).toFixed(4)}`
            : 'Pickup coordinates available',
          corridor: zone?.name ?? 'Unassigned corridor',
          zone: zone?.name ?? 'Unassigned zone',
          priorityScore: priorityToScore(request?.priorityLevel),
          activeConflictCount: conflictCountsByTripId.get(tripId) ?? 0,
          hasBlockingConflicts: blockingTripIds.has(tripId),
          readinessState: blockingTripIds.has(tripId) ? 'BLOCKED' : (trip.driverUserId ? 'READY' : 'PENDING'),
          ridersJoined: request?.peopleCount ?? trip.passengers ?? 0,
          capacity: vehicle?.seatCapacity ?? request?.peopleCount ?? trip.passengers ?? 0,
          driver: driver ? `Driver ${shortCode(driver.userId)}` : 'Unassigned',
          vehicle: vehicle?.label ?? 'Vehicle TBD',
          status: tripStatusLabel(trip.status),
          updatedAt: trip.updated_at ?? trip.created_at ?? now,
        },
      };
    });

  const driverMarkers = activeDrivers
    .filter((driver) => Number.isFinite(driver.currentLocation?.lng) && Number.isFinite(driver.currentLocation?.lat))
    .map((driver) => {
      const assignedTrip = activeTrips.find((trip) => toObjectIdString(trip.driverUserId) === toObjectIdString(driver.userId));
      return {
        id: toObjectIdString(driver._id),
        unitId: `DRV-${shortCode(driver.userId)}`,
        coordinates: [driver.currentLocation.lng, driver.currentLocation.lat],
        zone: assignedTrip ? `RG-${shortCode(assignedTrip._id)}` : 'Unassigned',
        assignedRideGroupId: assignedTrip ? `RG-${shortCode(assignedTrip._id)}` : null,
      };
    });

  const pickupPointMap = new Map();

  for (const tripMarker of tripMarkers) {
    const key = tripMarker.coordinates.join(',');
    const existing = pickupPointMap.get(key) ?? {
      id: `pickup-${tripMarker.id.toLowerCase()}`,
      name: tripMarker.rideGroup.pickupPoint,
      coordinates: tripMarker.coordinates,
      zone: tripMarker.rideGroup.zone,
      demandNote: 'Live pickup demand from active trips',
      rideGroups: [],
    };
    existing.rideGroups.push({ id: tripMarker.rideGroup.id });
    pickupPointMap.set(key, existing);
  }

  const zoneFeatures = riskZones.map(buildZoneFeature).filter(Boolean);
  const pickupPoints = [...pickupPointMap.values()];
  const viewport = buildViewport([
    ...tripMarkers.map((item) => item.coordinates),
    ...driverMarkers.map((item) => item.coordinates),
    ...pickupPoints.map((item) => item.coordinates),
    ...zoneFeatures.flatMap((item) => collectGeometryCoordinates(item.geometry?.geometry)),
  ]);

  res.json({
    ok: true,
    summary: {
      activeRideGroups: activeTrips.length,
      movingRideGroups: movingTrips.length,
      waitingUnmatchedRiders: waitingRequests.length,
      activeDrivers: activeDrivers.length,
      stagedDrivers: Math.max(activeDrivers.filter((driver) => driver.status === 'available').length, 0),
      criticalAlerts: activeCriticalIncidents + activeConflicts.filter((conflict) => conflict.severity === 'critical').length,
      flaggedGroups: blockingTripIds.size,
      map: {
        activeGroups: tripMarkers.length,
        trackedDrivers: driverMarkers.length,
        activePickupPoints: pickupPointMap.size || pickupZones.length,
        restrictedZones: zoneFeatures.length,
        dangerZones: activeConflictZones,
        mapLinkedAlerts: activeCriticalIncidents,
      },
    },
    map: {
      rideGroups: tripMarkers,
      drivers: driverMarkers,
      pickupPoints,
      zones: zoneFeatures,
      alertAreas: [],
      viewport,
    },
  });
});

export default router;
