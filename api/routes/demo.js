import { Router } from 'express';
import Conflict from '../models/Conflict.js';
import Driver from '../models/Driver.js';
import EvacuationRequest from '../models/EvacuationRequest.js';
import Incident from '../models/Incident.js';
import RiskZone from '../models/RiskZone.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
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

function driverOperationalLabel(status) {
  switch (status) {
    case 'available':
      return 'Available';
    case 'assigned':
      return 'Assigned';
    case 'en_route_pickup':
      return 'En Route to Pickup';
    case 'transporting':
      return 'Transporting';
    case 'unavailable':
      return 'Unavailable';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

function toLngLatCoordinates(trip) {
  if (Array.isArray(trip?.pickup_loc?.coordinates) && trip.pickup_loc.coordinates.length === 2) {
    return trip.pickup_loc.coordinates;
  }

  if (Number.isFinite(trip?.pickupLocation?.lng) && Number.isFinite(trip?.pickupLocation?.lat)) {
    return [trip.pickupLocation.lng, trip.pickupLocation.lat];
  }

  return null;
}

function toLatLngLocation(pointGeometry, fallback) {
  if (Array.isArray(pointGeometry?.coordinates) && pointGeometry.coordinates.length === 2) {
    return {
      lat: Number(pointGeometry.coordinates[1]),
      lng: Number(pointGeometry.coordinates[0]),
    };
  }

  if (Number.isFinite(fallback?.lat) && Number.isFinite(fallback?.lng)) {
    return {
      lat: Number(fallback.lat),
      lng: Number(fallback.lng),
    };
  }

  return null;
}

function formatCoordinateLabel(location) {
  if (!location) return 'Coordinates unavailable';
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return 'Coordinates unavailable';
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function buildIncidentAlertArea(incident, zoneName, relatedRideGroupId) {
  const [lng, lat] = Array.isArray(incident?.location?.coordinates) ? incident.location.coordinates : [null, null];
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const latOffset = 0.002;
  const lngOffset = 0.002;

  return {
    id: `alert-area-${toObjectIdString(incident._id)}`,
    alertId: toObjectIdString(incident._id),
    relatedRideGroupId,
    zone: zoneName ?? 'Unassigned zone',
    label: incident.title ?? incident.event_type ?? 'Incident',
    geometry: {
      type: 'Feature',
      properties: {
        id: `alert-area-${toObjectIdString(incident._id)}`,
        tone: Number(incident.severity ?? 0) >= 0.7 ? 'critical' : 'warning',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - lngOffset, lat - latOffset],
          [lng + lngOffset, lat - latOffset],
          [lng + lngOffset, lat + latOffset],
          [lng - lngOffset, lat + latOffset],
          [lng - lngOffset, lat - latOffset],
        ]],
      },
    },
  };
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
    activeIncidents,
    pickupZones,
    activeConflictZones,
  ] = await Promise.all([
    Trip.find({ status: { $nin: CLOSED_TRIP_STATUSES } }).sort({ updated_at: -1 }).limit(200).lean(),
    EvacuationRequest.find({ status: { $nin: ['completed', 'cancelled', 'failed'] } }).sort({ updatedAt: -1 }).limit(200).lean(),
    Driver.find().sort({ updatedAt: -1 }).lean(),
    Vehicle.find({ isActive: true }).lean(),
    RiskZone.find().sort({ updated_at: -1 }).lean(),
    Conflict.find({ status: 'active' }).select('tripId blocking severity').lean(),
    Incident.find({ isActive: true, expires_at: { $gt: now } })
      .sort({ created_at: -1 })
      .limit(500)
      .lean(),
    PickupZone.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(200).lean(),
    ConflictZone.countDocuments({ status: 'active', activeUntil: { $gt: now } }),
  ]);

  const userIds = new Set(
    [...drivers.map((driver) => toObjectIdString(driver.userId))]
      .filter(Boolean),
  );

  const users = userIds.size
    ? await User.find({ _id: { $in: [...userIds] } }).select('name role').lean()
    : [];

  const requestById = new Map(requests.map((request) => [toObjectIdString(request._id), request]));
  const vehicleById = new Map(vehicles.map((vehicle) => [toObjectIdString(vehicle._id), vehicle]));
  const zoneById = new Map(riskZones.map((zone) => [toObjectIdString(zone._id), zone]));
  const driverByUserId = new Map(drivers.map((driver) => [toObjectIdString(driver.userId), driver]));
  const userById = new Map(users.map((user) => [toObjectIdString(user._id), user]));
  const activeCriticalIncidents = activeIncidents.filter((incident) => Number(incident.severity ?? 0) >= 0.7).length;

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

  const alertsByTripId = new Map();

  activeIncidents.forEach((incident) => {
    const tripId = toObjectIdString(incident.tripId);
    if (!tripId) return;
    const existing = alertsByTripId.get(tripId) ?? [];
    existing.push(toObjectIdString(incident._id));
    alertsByTripId.set(tripId, existing);
  });

  const rideGroups = activeTrips
    .map((trip) => {
      const tripId = toObjectIdString(trip._id);
      const request = requestById.get(toObjectIdString(trip.requestId)) ?? null;
      const driver = driverByUserId.get(toObjectIdString(trip.driverUserId)) ?? null;
      const vehicle = vehicleById.get(toObjectIdString(trip.vehicleId)) ?? null;
      const zone = zoneById.get(toObjectIdString(request?.destinationZoneId)) ?? null;
      const driverUser = userById.get(toObjectIdString(trip.driverUserId)) ?? null;
      const groupId = `RG-${shortCode(tripId)}`;
      const pickupLocation = toLatLngLocation(trip.pickup_loc, trip.pickupLocation);
      const dropoffLocation = toLatLngLocation(trip.dropoff_loc, trip.dropoffLocation);
      const ridersJoined = request?.peopleCount ?? trip.passengers ?? 0;
      const capacity = Math.max(vehicle?.seatCapacity ?? ridersJoined, ridersJoined);
      const hasBlockingConflicts = blockingTripIds.has(tripId);
      const activeConflictCount = conflictCountsByTripId.get(tripId) ?? 0;
      const hasDriver = Boolean(trip.driverUserId);
      const hasVehicle = Boolean(trip.vehicleId);
      const status = tripStatusLabel(trip.status);
      const readinessEstimate = hasBlockingConflicts
        ? 'Blocked by active conflict'
        : status === 'En Route'
          ? 'Departed'
          : !hasDriver
            ? 'Pending driver assignment'
            : !hasVehicle
              ? 'Pending vehicle assignment'
              : 'Pending dispatch release';
      const linkedAlertIds = alertsByTripId.get(tripId) ?? [];

      return {
        id: groupId,
        tripId,
        requestId: toObjectIdString(trip.requestId),
        driverUserId: toObjectIdString(trip.driverUserId),
        vehicleId: toObjectIdString(trip.vehicleId),
        zoneId: toObjectIdString(request?.destinationZoneId),
        requestStatus: request?.status ?? 'pending',
        tripStatus: trip.status ?? 'pending',
        priorityLevel: request?.priorityLevel ?? 'medium',
        pickupPoint: zone?.name ? `${zone.name} pickup` : `Pickup ${shortCode(tripId)}`,
        pickupDetail: formatCoordinateLabel(pickupLocation),
        corridor: zone?.name ?? 'Unassigned corridor',
        zone: zone?.name ?? 'Unassigned zone',
        ridersJoined,
        capacity,
        driver: hasDriver ? (driverUser?.name ?? `Driver ${shortCode(trip.driverUserId)}`) : 'Unassigned',
        driverUnitId: hasDriver ? `DRV-${shortCode(trip.driverUserId)}` : null,
        vehicle: vehicle?.label ?? (hasDriver ? 'Vehicle TBD' : 'Pending dispatch'),
        status,
        interventionState: hasBlockingConflicts ? 'Needs Review' : linkedAlertIds.length ? 'Monitoring' : 'None',
        priorityScore: priorityToScore(request?.priorityLevel),
        activeConflictCount,
        hasBlockingConflicts,
        readinessState: hasBlockingConflicts ? 'BLOCKED' : (hasDriver ? 'READY' : 'PENDING'),
        actionState: hasBlockingConflicts ? 'BLOCKED' : (hasDriver ? 'READY' : 'PENDING'),
        createdAt: trip.created_at ?? now,
        updatedAt: trip.updated_at ?? trip.created_at ?? now,
        departureReadiness: readinessEstimate,
        departureReadinessDetail: {
          driverAssigned: hasDriver ? 'Yes' : 'No',
          minimumRidersReached: ridersJoined >= Math.min(capacity, 3) ? 'Yes' : 'No',
          riderCheckIn: `${ridersJoined} of ${capacity} confirmed`,
          routeAdvisory: hasBlockingConflicts ? 'Conflict review required' : 'Route under live monitoring',
          readinessEstimate,
        },
        summary: `${groupId} is ${status.toLowerCase()} in ${zone?.name ?? 'an unassigned zone'}.`,
        routeNotes: [],
        pickupIssues: hasBlockingConflicts ? ['Blocking conflict requires operator review before movement.'] : [],
        linkedAlertIds,
        riders: [],
        schemaRefs: {
          tripId,
          requestId: toObjectIdString(trip.requestId),
          driverUserId: toObjectIdString(trip.driverUserId),
          vehicleId: toObjectIdString(trip.vehicleId),
          zoneId: toObjectIdString(request?.destinationZoneId),
        },
        schemaStatus: {
          trip: trip.status ?? 'pending',
          request: request?.status ?? 'pending',
          driver: driver?.status ?? null,
        },
        schemaSnapshot: {
          trip,
          request,
          driver,
          vehicle,
          zone,
          driverUser,
        },
        pickupCoordinates: pickupLocation
          ? [pickupLocation.lng, pickupLocation.lat]
          : toLngLatCoordinates(trip),
      };
    })
    .filter((group) => Array.isArray(group.pickupCoordinates) && group.pickupCoordinates.length === 2);

  const rideGroupByTripId = new Map(rideGroups.map((group) => [group.tripId, group]));

  const tripMarkers = rideGroups.map((rideGroup) => ({
    id: rideGroup.id,
    coordinates: rideGroup.pickupCoordinates,
    rideGroup,
  }));

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
  const alertAreas = activeIncidents
    .map((incident) => {
      const incidentTripId = toObjectIdString(incident.tripId);
      const relatedRideGroup = incidentTripId ? rideGroupByTripId.get(incidentTripId) ?? null : null;
      const zoneName = zoneById.get(toObjectIdString(incident.zoneId))?.name ?? relatedRideGroup?.zone ?? 'Unassigned zone';
      return buildIncidentAlertArea(incident, zoneName, relatedRideGroup?.id ?? null);
    })
    .filter(Boolean);

  const viewport = buildViewport([
    ...tripMarkers.map((item) => item.coordinates),
    ...driverMarkers.map((item) => item.coordinates),
    ...pickupPoints.map((item) => item.coordinates),
    ...zoneFeatures.flatMap((item) => collectGeometryCoordinates(item.geometry?.geometry)),
    ...alertAreas.flatMap((item) => collectGeometryCoordinates(item.geometry?.geometry)),
  ]);

  const requestsFeed = requests.map((request) => {
    const requestId = toObjectIdString(request._id);
    const destinationZoneId = toObjectIdString(request.destinationZoneId);
    const destinationZone = zoneById.get(destinationZoneId) ?? null;
    return {
      _id: requestId,
      status: request.status ?? 'pending',
      priorityLevel: request.priorityLevel ?? 'medium',
      peopleCount: request.peopleCount ?? 0,
      pickupLocation: request.pickupLocation ?? null,
      destinationZoneId,
      destinationZoneName: destinationZone?.name ?? 'Unassigned zone',
      assignedTripId: toObjectIdString(request.assignedTripId),
      assignedDriverUserId: toObjectIdString(request.assignedDriverUserId),
      assignedVehicleId: toObjectIdString(request.assignedVehicleId),
      createdAt: request.createdAt ?? request.created_at ?? now,
      updatedAt: request.updatedAt ?? request.updated_at ?? now,
    };
  });

  const tripsFeed = activeTrips.map((trip) => ({
    _id: toObjectIdString(trip._id),
    status: trip.status ?? 'pending',
    requestId: toObjectIdString(trip.requestId),
    driverUserId: toObjectIdString(trip.driverUserId),
    vehicleId: toObjectIdString(trip.vehicleId),
    passengers: trip.passengers ?? 0,
    pickupLocation: toLatLngLocation(trip.pickup_loc, trip.pickupLocation),
    dropoffLocation: toLatLngLocation(trip.dropoff_loc, trip.dropoffLocation),
    estimatedDistanceKm: trip.estimatedDistanceKm ?? null,
    estimatedDurationMin: trip.estimatedDurationMin ?? null,
    startedAt: trip.startedAt ?? null,
    completedAt: trip.completedAt ?? null,
    createdAt: trip.created_at ?? now,
    updatedAt: trip.updated_at ?? trip.created_at ?? now,
  }));

  const vehiclesFeed = vehicles.map((vehicle) => ({
    _id: toObjectIdString(vehicle._id),
    driverUserId: toObjectIdString(vehicle.driverUserId),
    label: vehicle.label ?? `Vehicle ${shortCode(vehicle._id)}`,
    type: vehicle.type ?? 'other',
    seatCapacity: vehicle.seatCapacity ?? 0,
    isActive: Boolean(vehicle.isActive),
    currentLocation: vehicle.currentLocation ?? null,
    updatedAt: vehicle.updatedAt ?? now,
    createdAt: vehicle.createdAt ?? now,
  }));

  const driversFeed = drivers.map((driver) => {
    const userId = toObjectIdString(driver.userId);
    const linkedVehicle = vehicleById.get(toObjectIdString(driver.vehicleId)) ?? null;
    const linkedUser = userById.get(userId) ?? null;
    return {
      _id: toObjectIdString(driver._id),
      userId,
      vehicleId: toObjectIdString(driver.vehicleId),
      displayName: linkedUser?.name ?? `Driver ${shortCode(userId)}`,
      unitId: `DRV-${shortCode(userId)}`,
      status: driver.status ?? 'offline',
      operationalState: driverOperationalLabel(driver.status),
      currentLocation: driver.currentLocation ?? null,
      lastHeartbeatAt: driver.lastHeartbeatAt ?? null,
      capacityOverride: driver.capacityOverride ?? linkedVehicle?.seatCapacity ?? null,
      notes: driver.notes ?? '',
      updatedAt: driver.updatedAt ?? now,
      createdAt: driver.createdAt ?? now,
    };
  });

  const activityFeed = [
    ...rideGroups.map((group) => ({
      id: `activity-trip-${group.tripId}`,
      timestamp: group.updatedAt,
      title: `${group.id} ${group.status.toLowerCase()}`,
      description: `${group.pickupPoint} in ${group.zone}`,
      meta: `${group.driver} · ${group.ridersJoined}/${group.capacity}`,
      rideGroupId: group.id,
      tripId: group.tripId,
    })),
    ...activeIncidents.map((incident) => {
      const tripId = toObjectIdString(incident.tripId);
      const linkedRideGroup = tripId ? rideGroupByTripId.get(tripId) ?? null : null;
      return {
        id: `activity-incident-${toObjectIdString(incident._id)}`,
        timestamp: incident.created_at ?? now,
        title: incident.title ?? incident.event_type ?? 'Incident reported',
        description: linkedRideGroup
          ? `Linked to ${linkedRideGroup.id} in ${linkedRideGroup.zone}`
          : 'Incident linked to live operational feed',
        meta: Number(incident.severity ?? 0) >= 0.7 ? 'Critical severity' : 'Monitoring severity',
        rideGroupId: linkedRideGroup?.id ?? null,
        tripId: linkedRideGroup?.tripId ?? null,
      };
    }),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 40);

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
      alertAreas,
      viewport,
    },
    feeds: {
      rideGroups: rideGroups.map(({ pickupCoordinates, ...rideGroup }) => rideGroup),
      trips: tripsFeed,
      requests: requestsFeed,
      drivers: driversFeed,
      vehicles: vehiclesFeed,
      activity: activityFeed,
    },
  });
});

export default router;
