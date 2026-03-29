import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import {
  getConflictSeverityRank,
  getHighestConflictSeverity,
  groupConflictsByTrip,
  isAssignmentConflictType,
  sortConflictsByUrgency,
} from './utils/conflictDisplay';
import { buildRideGroupTimeline, evaluateAlert, evaluateRideGroup } from './utils/decisionEngine';

const OperationsContext = createContext(null);
const DEFAULT_MAP_CENTER = [-86.1581, 39.7684];

const DEFAULT_LIVE_MAP_DATA = {
  center: DEFAULT_MAP_CENTER,
  zoom: 11,
  mapRideGroups: [],
  mapDrivers: [],
  mapPickupPoints: [],
  mapZones: [],
  mapAlertAreas: [],
};

const operationsMap = {
  summary: [],
  legend: [
    { label: 'Ride Group', type: 'ride-group' },
    { label: 'Driver', type: 'driver' },
    { label: 'Pickup Point', type: 'pickup' },
    { label: 'Restricted Zone', type: 'restricted' },
  ],
  zones: [],
  routes: [],
  markers: [],
  annotations: [],
};

function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatDriverStatusLabel(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'available') return 'Available';
  if (normalized === 'assigned') return 'Assigned';
  if (normalized === 'en_route_pickup') return 'En Route to Pickup';
  if (normalized === 'transporting') return 'Transporting';
  if (normalized === 'unavailable') return 'Unavailable';
  if (normalized === 'offline') return 'Offline';
  return 'Unknown';
}

function deriveDriverIssueState(driver) {
  const note = String(driver?.notes ?? '').toLowerCase();
  const status = String(driver?.status ?? '').toLowerCase();
  if (status === 'offline') return 'No live heartbeat';
  if (status === 'unavailable') return 'Unavailable for dispatch';
  if (note.includes('delay')) return 'Delayed';
  if (note.includes('telemetry') || note.includes('stopped')) return 'No location update received';
  if (note.includes('route') && note.includes('conflict')) return 'Route conflict under review';
  return null;
}

function normalizeBackendRideGroup(group, index) {
  if (!group || typeof group !== 'object') return null;
  const rideGroupId = String(group.id ?? `RG-${String(group.tripId ?? index).slice(-4).toUpperCase()}`);
  const tripId = group.tripId ? String(group.tripId) : null;
  const requestId = group.requestId ? String(group.requestId) : null;
  const driverUserId = group.driverUserId ? String(group.driverUserId) : null;
  const vehicleId = group.vehicleId ? String(group.vehicleId) : null;
  const zoneId = group.zoneId ? String(group.zoneId) : null;
  const ridersJoined = Number(group.ridersJoined ?? 0);
  const capacity = Math.max(Number(group.capacity ?? ridersJoined), ridersJoined);
  const createdAt = group.createdAt ?? new Date().toISOString();
  const updatedAt = group.updatedAt ?? createdAt;
  const status = group.status ?? 'Open';
  const interventionState = group.interventionState ?? 'None';
  const readinessEstimate = group.departureReadinessDetail?.readinessEstimate
    ?? group.departureReadiness
    ?? (status === 'En Route' ? 'Departed' : 'Pending dispatch release');

  return {
    ...group,
    id: rideGroupId,
    tripId,
    requestId,
    driverUserId,
    vehicleId,
    zoneId,
    ridersJoined,
    capacity,
    driver: group.driver ?? (driverUserId ? `Driver ${driverUserId.slice(-4).toUpperCase()}` : 'Unassigned'),
    driverUnitId: group.driverUnitId ?? (driverUserId ? `DRV-${driverUserId.slice(-4).toUpperCase()}` : null),
    vehicle: group.vehicle ?? (vehicleId ? `Vehicle ${vehicleId.slice(-4).toUpperCase()}` : 'Vehicle TBD'),
    status,
    interventionState,
    createdAt,
    updatedAt,
    linkedAlertIds: Array.isArray(group.linkedAlertIds) ? group.linkedAlertIds.map(String) : [],
    routeNotes: Array.isArray(group.routeNotes) ? group.routeNotes : [],
    pickupIssues: Array.isArray(group.pickupIssues) ? group.pickupIssues : [],
    riders: Array.isArray(group.riders) ? group.riders : [],
    schemaRefs: {
      tripId,
      requestId,
      driverUserId,
      vehicleId,
      zoneId,
      ...(group.schemaRefs ?? {}),
    },
    schemaStatus: {
      trip: group.tripStatus ?? group.schemaStatus?.trip ?? null,
      request: group.requestStatus ?? group.schemaStatus?.request ?? null,
      driver: group.schemaStatus?.driver ?? null,
    },
    schemaSnapshot: {
      ...(group.schemaSnapshot ?? {}),
      driverUser: group.schemaSnapshot?.driverUser
        ? {
          ...group.schemaSnapshot.driverUser,
          fullName: group.schemaSnapshot.driverUser.fullName ?? group.schemaSnapshot.driverUser.name,
        }
        : group.schemaSnapshot?.driverUser ?? null,
    },
    departureReadiness: group.departureReadiness ?? readinessEstimate,
    departureReadinessDetail: {
      driverAssigned: group.departureReadinessDetail?.driverAssigned ?? (driverUserId ? 'Yes' : 'No'),
      minimumRidersReached: group.departureReadinessDetail?.minimumRidersReached ?? (ridersJoined > 0 ? 'Yes' : 'No'),
      riderCheckIn: group.departureReadinessDetail?.riderCheckIn ?? `${ridersJoined} of ${capacity} confirmed`,
      routeAdvisory: group.departureReadinessDetail?.routeAdvisory ?? 'Route under live monitoring',
      readinessEstimate,
      ...(group.departureReadinessDetail ?? {}),
    },
    summary: group.summary ?? `${rideGroupId} is active in ${group.zone ?? 'the assigned zone'}.`,
    priorityScore: typeof group.priorityScore === 'number' ? group.priorityScore : 0,
    activeConflictCount: Number(group.activeConflictCount ?? 0),
    hasBlockingConflicts: Boolean(group.hasBlockingConflicts),
    readinessState: group.readinessState ?? (driverUserId ? 'READY' : 'PENDING'),
    actionState: group.actionState ?? (driverUserId ? 'READY' : 'PENDING'),
  };
}

function normalizeBackendDriver(driver, index) {
  if (!driver || typeof driver !== 'object') return null;
  const userId = driver.userId ? String(driver.userId) : null;
  const id = String(driver._id ?? `driver-${index}`);
  const unitId = driver.unitId ?? (userId ? `DRV-${userId.slice(-4).toUpperCase()}` : `DRV-${String(index + 1).padStart(3, '0')}`);
  return {
    ...driver,
    _id: id,
    userId,
    vehicleId: driver.vehicleId ? String(driver.vehicleId) : null,
    unitId,
    displayName: driver.displayName ?? (userId ? `Driver ${userId.slice(-4).toUpperCase()}` : `Driver ${index + 1}`),
    status: String(driver.status ?? 'offline').toLowerCase(),
    operationalState: driver.operationalState ?? formatDriverStatusLabel(driver.status),
    updatedAt: driver.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeBackendVehicle(vehicle, index) {
  if (!vehicle || typeof vehicle !== 'object') return null;
  const id = String(vehicle._id ?? `vehicle-${index}`);
  return {
    ...vehicle,
    _id: id,
    driverUserId: vehicle.driverUserId ? String(vehicle.driverUserId) : null,
    isActive: vehicle.isActive !== false,
    seatCapacity: Number(vehicle.seatCapacity ?? 0),
    label: vehicle.label ?? `Vehicle ${id.slice(-4).toUpperCase()}`,
  };
}

function mapBackendActivityItem(item, index) {
  const timestamp = item?.timestamp ?? item?.updatedAt ?? item?.createdAt ?? new Date().toISOString();
  return {
    id: String(item?.id ?? `activity-${index}`),
    time: formatClock(timestamp),
    title: item?.title ?? 'Operations update',
    description: item?.description ?? 'Live backend event',
    meta: item?.meta ?? '',
    timestamp,
    tripId: item?.tripId ? String(item.tripId) : null,
    rideGroupId: item?.rideGroupId ? String(item.rideGroupId) : null,
  };
}

function buildFallbackActivity(rideGroups) {
  return [...(Array.isArray(rideGroups) ? rideGroups : [])]
    .sort(byNewest)
    .slice(0, 12)
    .map((group, index) => ({
      id: `activity-fallback-${group.id}-${index}`,
      time: formatClock(group.updatedAt ?? group.createdAt),
      title: `${group.id} ${String(group.status ?? 'Open').toLowerCase()}`,
      description: `${group.pickupPoint ?? 'Pickup point'} in ${group.zone ?? 'Unassigned zone'}`,
      meta: `${group.driver ?? 'Unassigned driver'} · ${group.ridersJoined ?? 0}/${group.capacity ?? 0}`,
      timestamp: group.updatedAt ?? group.createdAt ?? new Date().toISOString(),
      tripId: group.tripId ?? null,
      rideGroupId: group.id,
    }));
}

function formatCount(value) {
  return String(value);
}

function byNewest(a, b) {
  return new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt);
}

function byAlertPriority(a, b) {
  const severityRank = { Critical: 3, Warning: 2, Monitoring: 1 };
  const statusRank = { Open: 3, 'In Review': 2, Monitoring: 1, Resolved: 0 };
  const severityDelta = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
  if (severityDelta) return severityDelta;
  const statusDelta = (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0);
  if (statusDelta) return statusDelta;
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function severityFromIncident(incident) {
  const value = Number(incident?.severity ?? 0);
  if (value >= 0.75) return 'Critical';
  if (value >= 0.4) return 'Warning';
  return 'Monitoring';
}

function toneFromSeverity(severity) {
  if (severity === 'Critical') return 'strong';
  if (severity === 'Warning') return 'warning';
  return 'muted';
}

function statusFromIncident(incident) {
  return incident?.isActive === false ? 'Resolved' : 'Open';
}

function suggestedActionFromIncident(incident) {
  const eventType = String(incident?.event_type ?? '').toLowerCase();
  if (eventType.includes('road_block') || eventType.includes('checkpoint')) return 'Reroute traffic immediately';
  if (eventType.includes('armed_clash')) return 'Escalate and avoid corridor';
  if (eventType.includes('flood') || eventType.includes('fire')) return 'Dispatch alternate pickup path';
  return 'Monitor and triage impact';
}

function mapIncidentToAlert(incident, index, rideGroupIdByTripId = new Map(), zoneNameById = new Map()) {
  const severity = severityFromIncident(incident);
  const [lng, lat] = Array.isArray(incident?.location?.coordinates)
    ? incident.location.coordinates
    : [null, null];
  const tripId = incident?.tripId ? String(incident.tripId) : null;
  const inferredRideGroupId = tripId ? `RG-${tripId.slice(-4).toUpperCase()}` : null;

  return {
    id: String(incident?._id ?? `incident-alert-${index}`),
    code: `INC-${String(index + 1).padStart(3, '0')}`,
    title: incident?.title ?? String(incident?.event_type ?? 'Incident').replace(/_/g, ' '),
    description: incident?.description ?? 'Live incident reported from database feed.',
    severity,
    severityTone: toneFromSeverity(severity),
    status: statusFromIncident(incident),
    relatedGroupId: tripId ? (rideGroupIdByTripId.get(tripId) ?? inferredRideGroupId) : null,
    relatedZone: incident?.zoneId
      ? (zoneNameById.get(String(incident.zoneId)) ?? `Zone ${String(incident.zoneId).slice(-4)}`)
      : 'Unzoned',
    suggestedAction: suggestedActionFromIncident(incident),
    createdAt: incident?.created_at ?? new Date().toISOString(),
    assignedDriver: null,
    pickupPoint: Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Coordinate unavailable',
    resolvedToday: false,
    source: 'database',
  };
}

function mapConflictZoneToAlert(zone, index) {
  const riskLevel = String(zone?.riskLevel ?? 'green').toLowerCase();
  const severity = riskLevel === 'red' ? 'Critical' : riskLevel === 'orange' ? 'Warning' : 'Monitoring';
  return {
    id: `conflict-zone-alert-${zone?.zoneId ?? index}`,
    code: `CNF-${String(index + 1).padStart(3, '0')}`,
    title: `Conflict zone ${zone?.zoneType ?? 'risk'}`,
    description: `Conflict zone ${zone?.zoneId ?? 'unknown'} is currently marked ${riskLevel}.`,
    severity,
    severityTone: toneFromSeverity(severity),
    status: 'Open',
    relatedGroupId: null,
    relatedZone: zone?.zoneId ?? `Conflict-${index + 1}`,
    suggestedAction: zone?.recommendedAction ? String(zone.recommendedAction).replace(/_/g, ' ') : 'Review route safety',
    createdAt: zone?.activeUntil ?? new Date().toISOString(),
    assignedDriver: null,
    pickupPoint: 'Conflict map zone',
    resolvedToday: false,
    source: 'database',
  };
}

function formatRiskLevelLabel(riskLevel) {
  const normalized = String(riskLevel ?? '').toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractGeometryCoordinates(geometry) {
  if (!geometry?.type || !geometry?.coordinates) return [];
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'Polygon') return geometry.coordinates.flat(1);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}

function deriveConflictMapViewport(conflictZones) {
  const coordinates = (Array.isArray(conflictZones) ? conflictZones : [])
    .flatMap((zone) => extractGeometryCoordinates(zone.geometry))
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
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

function deriveConflictCountryItems(conflictZones) {
  const grouped = new Map();

  for (const zone of Array.isArray(conflictZones) ? conflictZones : []) {
    const country = zone.metadata?.countries?.[0] ?? 'Unknown';
    const existing = grouped.get(country) ?? {
      id: `conflict-country-${country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      country,
      zoneCount: 0,
      highestScore: 0,
      highestRiskLevel: 'green',
      coordinates: [],
      zones: [],
    };

    existing.zoneCount += 1;
    existing.highestScore = Math.max(existing.highestScore, zone.score ?? 0);
    const riskRank = { green: 1, yellow: 2, orange: 3, red: 4 };
    if ((riskRank[zone.riskLevel] ?? 0) >= (riskRank[existing.highestRiskLevel] ?? 0)) {
      existing.highestRiskLevel = zone.riskLevel ?? existing.highestRiskLevel;
    }
    existing.coordinates.push(...extractGeometryCoordinates(zone.geometry));
    existing.zones.push(zone);
    grouped.set(country, existing);
  }

  return [...grouped.values()].map((group) => {
    const validCoordinates = group.coordinates
      .filter((pair) => Array.isArray(pair) && pair.length >= 2)
      .map(([lng, lat]) => [Number(lng), Number(lat)])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

    if (!validCoordinates.length) return null;

    const lngs = validCoordinates.map(([lng]) => lng);
    const lats = validCoordinates.map(([, lat]) => lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    return {
      id: group.id,
      country: group.country,
      zoneCount: group.zoneCount,
      highestScore: group.highestScore,
      highestRiskLevel: group.highestRiskLevel,
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
      bounds: [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      zones: group.zones,
    };
  }).filter(Boolean);
}

function buildConflictZoneMapItem(zone) {
  const geometryFeature = zone?.geometry
    ? {
      type: 'Feature',
      properties: {
        id: zone.zoneId,
        riskLevel: zone.riskLevel,
        zoneType: zone.zoneType,
        recommendedAction: zone.recommendedAction,
      },
      geometry: zone.geometry,
    }
    : null;

  return {
    id: zone.zoneId,
    zoneId: zone.zoneId,
    zoneType: zone.zoneType,
    riskLevel: zone.riskLevel,
    riskLabel: formatRiskLevelLabel(zone.riskLevel),
    score: zone.score,
    confidence: zone.confidence,
    recommendedAction: zone.recommendedAction,
    activeUntil: zone.activeUntil,
    centroid: zone.centroid,
    geometry: geometryFeature,
    metadata: zone.metadata ?? {},
    country: zone.metadata?.countries?.[0] ?? null,
  };
}

function getReopenedStatus(group) {
  if ((group.ridersJoined ?? 0) >= (group.capacity ?? Number.MAX_SAFE_INTEGER)) return 'Full';
  if ((group.ridersJoined ?? 0) > 0) return 'Filling';
  return 'Open';
}

function formatDriverAssignment(driverContext, rideGroup) {
  const driverName = driverContext?.displayName ?? rideGroup?.schemaSnapshot?.driverUser?.fullName ?? null;
  const unitId = driverContext?.unitId ?? rideGroup?.driverUnitId ?? null;
  const vehicleLabel = rideGroup?.schemaSnapshot?.vehicle?.label ?? rideGroup?.vehicle ?? null;

  return {
    name: driverName,
    unitId,
    status: driverContext?.operationalState ?? 'No driver assigned',
    vehicleLabel,
    userId: rideGroup?.schemaRefs?.driverUserId ?? rideGroup?.driverUserId ?? null,
    vehicleId: rideGroup?.schemaRefs?.vehicleId ?? rideGroup?.vehicleId ?? null,
    assigned: Boolean(rideGroup?.schemaRefs?.driverUserId ?? rideGroup?.driverUserId),
  };
}

function deriveReadinessState(rideGroup, activeIssues, driverAssignment) {
  if (!rideGroup) return 'PENDING';
  if (rideGroup.schemaStatus?.request === 'cancelled' || rideGroup.schemaStatus?.trip === 'cancelled') return 'BLOCKED';
  if (rideGroup.schemaStatus?.request === 'completed' || rideGroup.schemaStatus?.trip === 'completed' || rideGroup.schemaStatus?.trip === 'in_transit') return 'READY';
  if (!driverAssignment.assigned) return 'BLOCKED';
  if (activeIssues.some((issue) => issue.status === 'In Review')) return 'FLAGGED';
  if (activeIssues.some((issue) => issue.status === 'Open')) return 'BLOCKED';

  const readinessEstimate = rideGroup.departureReadinessDetail?.readinessEstimate?.toLowerCase() ?? '';
  if (readinessEstimate.includes('ready') || readinessEstimate.includes('departed')) return 'READY';
  return 'PENDING';
}

function deriveActionState(rideGroup, readinessState, activeIssues) {
  if (!rideGroup) return 'PENDING';
  if (rideGroup.status === 'Flagged' || activeIssues.some((issue) => issue.status === 'In Review')) return 'FLAGGED';
  if (rideGroup.schemaStatus?.request === 'cancelled' || rideGroup.schemaStatus?.trip === 'cancelled') return 'BLOCKED';
  if (activeIssues.some((issue) => issue.status === 'Open') || !rideGroup.schemaRefs?.driverUserId) return 'BLOCKED';
  if (readinessState === 'READY') return 'READY';
  return 'PENDING';
}

function mapRideGroupToOperationalViewModel(rideGroup, alerts, drivers, auditEntries, conflicts, conflictDataStatus) {
  const linkedAlerts = (Array.isArray(alerts) ? alerts : []).filter((alert) => (rideGroup.linkedAlertIds ?? []).includes(alert.id));
  const activeAlerts = linkedAlerts.filter((alert) => alert.status !== 'Resolved');
  const driverAssignment = formatDriverAssignment(rideGroup.driverContext, rideGroup);
  const driverIssue = rideGroup.driverContext?.issueState
    ? {
      id: `${rideGroup.id}-driver-issue`,
      label: rideGroup.driverContext.issueState,
      severity: 'driver',
      status: driverAssignment.assigned ? 'Monitoring' : 'Open',
      source: 'driver',
    }
    : null;
  const activeIssues = [
    ...activeAlerts.map((alert) => ({
      id: alert.id,
      label: alert.title,
      severity: alert.severity,
      status: alert.status,
      source: 'incident',
    })),
    ...(driverIssue ? [driverIssue] : []),
  ];
  const readinessState = deriveReadinessState(rideGroup, activeIssues, driverAssignment);
  const actionState = deriveActionState(rideGroup, readinessState, activeIssues);
  const capacity = rideGroup.capacity ?? rideGroup.schemaSnapshot?.vehicle?.seatCapacity ?? null;
  const riderCount = rideGroup.ridersJoined ?? rideGroup.schemaSnapshot?.request?.peopleCount ?? 0;
  const decision = evaluateRideGroup({
    ...rideGroup,
    driverAssignment,
    readinessState,
    actionState,
    assignedRiderCount: riderCount,
    capacity,
  }, linkedAlerts, drivers);
  const flagged = Boolean(
    rideGroup.flagged
    || rideGroup.status === 'Flagged'
    || decision.autoFlags.length > 0
    || activeIssues.some((issue) => issue.status === 'In Review')
  );
  const auditTrail = (Array.isArray(auditEntries) ? auditEntries : []).filter((entry) => (
    entry.tripId === rideGroup.tripId || entry.rideGroupId === rideGroup.id
  )).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const activeConflicts = Array.isArray(conflicts) ? [...conflicts].sort(sortConflictsByUrgency) : [];
  const blockingConflictCount = activeConflicts.filter((conflict) => conflict.blocking).length;
  const highestConflictSeverity = getHighestConflictSeverity(activeConflicts);
  const hasAssignmentConflict = activeConflicts.some((conflict) => isAssignmentConflictType(conflict.type));

  // Temporary adapter: DBSchema defines trip/request/driver/vehicle/incident records, not a single
  // ride-detail document. Phase 5 components still expect summary/readiness/manifest notes, so we
  // normalize the schema-backed relations into one operational view model here.
  return {
    ...rideGroup,
    linkedAlerts,
    activeIssues,
    driverAssignment,
    flagged,
    autoFlags: decision.autoFlags,
    priorityScore: decision.priorityScore,
    recommendations: decision.recommendations,
    auditTrail,
    timeline: buildRideGroupTimeline({
      ...rideGroup,
      driverAssignment,
      flagged,
    }, linkedAlerts),
    readinessState,
    actionState,
    conflicts: activeConflicts,
    activeConflictCount: activeConflicts.length,
    blockingConflictCount,
    highestConflictSeverity,
    hasActiveConflicts: activeConflicts.length > 0,
    hasBlockingConflicts: blockingConflictCount > 0,
    hasAssignmentConflict,
    conflictDataStatus,
    lifecycleStatus: rideGroup.status ?? 'Open',
    assignedRiderCount: riderCount,
    capacity,
    ridersJoined: riderCount,
    summary: rideGroup.summary ?? `Trip ${rideGroup.id} is active in ${rideGroup.zone ?? 'the assigned zone'}.`,
    departureReadiness: rideGroup.departureReadiness ?? 'Readiness data unavailable',
    departureReadinessDetail: rideGroup.departureReadinessDetail
      ? {
        ...rideGroup.departureReadinessDetail,
        driverAssigned: rideGroup.departureReadinessDetail.driverAssigned ?? (driverAssignment.assigned ? 'Yes' : 'No'),
        riderCheckIn: rideGroup.departureReadinessDetail.riderCheckIn ?? `${riderCount} of ${capacity ?? riderCount} assigned`,
        readinessEstimate: rideGroup.departureReadinessDetail.readinessEstimate ?? readinessState,
      }
      : null,
    riders: Array.isArray(rideGroup.riders) ? rideGroup.riders : [],
    routeNotes: Array.isArray(rideGroup.routeNotes) ? rideGroup.routeNotes : [],
    pickupIssues: Array.isArray(rideGroup.pickupIssues) ? rideGroup.pickupIssues : [],
  };
}

function createAuditEntry(item, rideGroupsByTripId, index = 0) {
  const tripId = item?.tripId ? String(item.tripId) : null;
  const relatedRideGroup = tripId ? rideGroupsByTripId.get(tripId) ?? null : null;
  const timestamp = item?.timestamp ?? item?.updatedAt ?? item?.createdAt ?? new Date().toISOString();

  return {
    id: String(item?.id ?? `audit-${index}`),
    actionType: item?.actionType ?? item?.eventType ?? 'operations_update',
    actor: item?.actor ?? 'Operations',
    note: item?.note ?? '',
    description: item?.description ?? item?.title ?? 'Operational update',
    timestamp,
    entityType: item?.entityType ?? 'trip',
    entityId: item?.entityId ?? tripId ?? relatedRideGroup?.tripId ?? null,
    rideGroupId: item?.rideGroupId ?? relatedRideGroup?.id ?? null,
    tripId: tripId ?? relatedRideGroup?.tripId ?? null,
  };
}

function buildAvailableDriverOptions(drivers, rideGroups, currentRideGroupId = null) {
  const activeAssignments = new Map(
    rideGroups
      .filter((group) => !['Completed', 'Cancelled'].includes(group.status))
      .filter((group) => group.driverAssignment?.userId)
      .map((group) => [group.driverAssignment.userId, group.id]),
  );

  return drivers.map((driver) => {
    const assignedRideGroupId = activeAssignments.get(driver.userId) ?? null;
    return {
      ...driver,
      assignedRideGroupId,
      isAvailable: !assignedRideGroupId || assignedRideGroupId === currentRideGroupId || driver.status === 'available',
    };
  });
}

function buildAvailableVehicleOptions(vehicles, rideGroups, currentRideGroupId = null) {
  const activeAssignments = new Map(
    rideGroups
      .filter((group) => !['Completed', 'Cancelled'].includes(group.status))
      .filter((group) => group.schemaRefs?.vehicleId)
      .map((group) => [group.schemaRefs.vehicleId, group.id]),
  );

  return vehicles.map((vehicle) => {
    const assignedRideGroupId = activeAssignments.get(vehicle._id) ?? null;
    return {
      ...vehicle,
      assignedRideGroupId,
      isAvailable: vehicle.isActive && (!assignedRideGroupId || assignedRideGroupId === currentRideGroupId),
    };
  });
}

export function OperationsProvider({ children }) {
  const [rideGroups, setRideGroups] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [backendOverview, setBackendOverview] = useState(null);
  const [backendOverviewState, setBackendOverviewState] = useState({ status: 'idle', error: '' });
  const [backendConflicts, setBackendConflicts] = useState([]);
  const [conflictSyncState, setConflictSyncState] = useState({ status: 'idle', error: '' });
  const [conflictIntelZones, setConflictIntelZones] = useState([]);
  const [conflictIntelSummary, setConflictIntelSummary] = useState(null);
  const [conflictIntelState, setConflictIntelState] = useState({ status: 'idle', error: '' });
  const [auditEntries, setAuditEntries] = useState([]);
  const [selectedRideGroupId, setSelectedRideGroupId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [mapFilters, setMapFilters] = useState({
    showRideGroups: true,
    showDrivers: true,
    showPickupPoints: true,
    showRestrictedZones: true,
    showConflictZones: true,
    showAlerts: true,
    zone: 'All',
    status: 'All',
  });
  const [confirmation, setConfirmation] = useState(null);
  const [alertsDataState, setAlertsDataState] = useState({ status: 'idle', error: '' });
  const backendFeedRideGroups = useMemo(() => (
    Array.isArray(backendOverview?.feeds?.rideGroups)
      ? backendOverview.feeds.rideGroups.map(normalizeBackendRideGroup).filter(Boolean)
      : []
  ), [backendOverview]);
  const backendFeedDrivers = useMemo(() => (
    Array.isArray(backendOverview?.feeds?.drivers)
      ? backendOverview.feeds.drivers.map(normalizeBackendDriver).filter(Boolean)
      : []
  ), [backendOverview]);
  const backendFeedVehicles = useMemo(() => (
    Array.isArray(backendOverview?.feeds?.vehicles)
      ? backendOverview.feeds.vehicles.map(normalizeBackendVehicle).filter(Boolean)
      : []
  ), [backendOverview]);
  const backendFeedActivity = useMemo(() => (
    Array.isArray(backendOverview?.feeds?.activity)
      ? backendOverview.feeds.activity.map(mapBackendActivityItem)
      : []
  ), [backendOverview]);

  useEffect(() => {
    let cancelled = false;

    async function loadDatabaseAlerts() {
      setAlertsDataState({ status: 'loading', error: '' });
      try {
        const [incidentsResponse, conflictZonesResponse] = await Promise.all([
          apiFetch('/api/incidents/public', { auth: false }),
          apiFetch('/api/conflict/zones', { auth: false }),
        ]);

        if (cancelled) return;

        const rideGroupIdByTripId = new Map(
          backendFeedRideGroups
            .filter((group) => group.tripId && group.id)
            .map((group) => [String(group.tripId), String(group.id)]),
        );
        const zoneNameById = new Map(
          (Array.isArray(backendOverview?.map?.zones) ? backendOverview.map.zones : [])
            .filter((zone) => zone?.id)
            .map((zone) => [String(zone.id), zone.name ?? 'Unassigned zone']),
        );

        const incidentAlerts = Array.isArray(incidentsResponse)
          ? incidentsResponse.map((incident, index) => mapIncidentToAlert(incident, index, rideGroupIdByTripId, zoneNameById))
          : [];

        const conflictAlerts = Array.isArray(conflictZonesResponse?.zones)
          ? conflictZonesResponse.zones
            .filter((zone) => ['red', 'orange'].includes(String(zone?.riskLevel ?? '').toLowerCase()))
            .map(mapConflictZoneToAlert)
          : [];

        const liveAlerts = [...incidentAlerts, ...conflictAlerts]
          .sort(byAlertPriority);

        setAlerts(liveAlerts);

        setAlertsDataState({ status: 'ready', error: '' });
      } catch (error) {
        if (cancelled) return;
        console.warn('Unable to load live alerts from database-backed endpoints.', error);
        setAlertsDataState({ status: 'error', error: error?.message ?? 'Alert feed unavailable' });
      }
    }

    loadDatabaseAlerts();
    const intervalId = window.setInterval(loadDatabaseAlerts, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [backendFeedRideGroups]);

  useEffect(() => {
    let cancelled = false;

    async function loadOperationsOverview() {
      setBackendOverviewState({ status: 'loading', error: '' });
      try {
        const response = await apiFetch('/api/demo/operations-overview', { auth: false });
        if (cancelled) return;
        setBackendOverview(response ?? null);
        setBackendOverviewState({ status: 'ready', error: '' });
      } catch (error) {
        if (cancelled) return;
        console.warn('Unable to load backend operations overview.', error);
        setBackendOverview(null);
        setBackendOverviewState({
          status: 'error',
          error: error?.message ?? 'Operations overview unavailable',
        });
      }
    }

    loadOperationsOverview();
    const intervalId = window.setInterval(loadOperationsOverview, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setRideGroups(backendFeedRideGroups);

    const activityItems = backendFeedActivity.length
      ? backendFeedActivity
      : buildFallbackActivity(backendFeedRideGroups);

    setActivity(activityItems.map((item) => ({
      id: item.id,
      time: item.time,
      title: item.title,
      description: item.description,
      meta: item.meta,
    })));

    const rideGroupsByTripId = new Map(
      backendFeedRideGroups
        .filter((group) => group.tripId)
        .map((group) => [String(group.tripId), group]),
    );
    setAuditEntries(activityItems.map((item, index) => createAuditEntry(item, rideGroupsByTripId, index)));
  }, [backendFeedActivity, backendFeedRideGroups]);

  useEffect(() => {
    let cancelled = false;

    async function loadConflicts() {
      setConflictSyncState({ status: 'loading', error: '' });
      try {
        const response = await apiFetch('/api/conflicts?status=active');
        if (cancelled) return;
        setBackendConflicts(Array.isArray(response?.conflicts) ? response.conflicts : []);
        setConflictSyncState({ status: 'ready', error: '' });
      } catch (error) {
        if (cancelled) return;
        console.warn('Unable to load backend conflicts for admin overlay.', error);
        setBackendConflicts([]);
        setConflictSyncState({
          status: 'error',
          error: error?.message ?? 'Conflict details unavailable',
        });
      }
    }

    loadConflicts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConflictIntel() {
      setConflictIntelState({ status: 'loading', error: '' });
      try {
        const [zonesResponse, summaryResponse] = await Promise.all([
          apiFetch('/api/conflict/zones', { auth: false }),
          apiFetch('/api/conflict/summary', { auth: false }),
        ]);

        if (cancelled) return;
        setConflictIntelZones(Array.isArray(zonesResponse?.zones) ? zonesResponse.zones.map(buildConflictZoneMapItem) : []);
        setConflictIntelSummary(summaryResponse ?? null);
        setConflictIntelState({ status: 'ready', error: '' });
      } catch (error) {
        if (cancelled) return;
        console.warn('Unable to load backend conflict zones for live map.', error);
        setConflictIntelZones([]);
        setConflictIntelSummary(null);
        setConflictIntelState({
          status: 'error',
          error: error?.message ?? 'Conflict zone data unavailable',
        });
      }
    }

    loadConflictIntel();
    const intervalId = window.setInterval(loadConflictIntel, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const usersById = useMemo(() => new Map(
    backendFeedDrivers
      .filter((driver) => driver.userId)
      .map((driver) => [driver.userId, {
        _id: driver.userId,
        fullName: driver.displayName ?? `Driver ${String(driver.userId).slice(-4).toUpperCase()}`,
      }]),
  ), [backendFeedDrivers]);
  const vehiclesById = useMemo(
    () => new Map(backendFeedVehicles.map((vehicle) => [vehicle._id, vehicle])),
    [backendFeedVehicles],
  );

  const driverContextMap = useMemo(() => {
    const rideGroupByDriverId = new Map(
      rideGroups
        .filter((group) => group.schemaRefs?.driverUserId)
        .map((group) => [String(group.schemaRefs.driverUserId), group]),
    );

    return new Map(
      backendFeedDrivers
        .map((driver) => {
          const assignedRideGroup = rideGroupByDriverId.get(String(driver.userId)) ?? null;
          return {
            unitId: driver.unitId,
            displayName: driver.displayName,
            operationalState: driver.operationalState ?? formatDriverStatusLabel(driver.status),
            lastUpdated: driver.updatedAt,
            quickNote: driver.notes ?? '',
            zone: assignedRideGroup?.zone ?? 'Unassigned zone',
            issueState: deriveDriverIssueState(driver),
          };
        })
        .filter((driverContext) => driverContext.unitId)
        .map((driverContext) => [driverContext.unitId, driverContext]),
    );
  }, [backendFeedDrivers, rideGroups]);

  const decisionDrivers = useMemo(() => backendFeedDrivers.map((driver) => {
    const driverContext = driverContextMap.get(driver.unitId) ?? null;

    return {
      ...driver,
      operationalState: driverContext?.operationalState ?? driver.operationalState ?? formatDriverStatusLabel(driver.status),
      unitId: driver.unitId ?? driverContext?.unitId ?? null,
      displayName: driver.displayName ?? driverContext?.displayName ?? null,
    };
  }), [backendFeedDrivers, driverContextMap]);

  const rideGroupsWithRelations = useMemo(() => rideGroups.map((group) => ({
    ...group,
    driverContext: group.driverUnitId ? driverContextMap.get(group.driverUnitId) ?? null : null,
  })), [driverContextMap, rideGroups]);

  const alertsWithRelations = useMemo(() => alerts.map((alert) => {
    const relatedRideGroup = rideGroupsWithRelations.find((group) => group.id === alert.relatedGroupId) ?? null;
    const driverContext = alert.assignedDriver ? driverContextMap.get(alert.assignedDriver) ?? null : (relatedRideGroup?.driverContext ?? null);
    return {
      ...alert,
      relatedRideGroup,
      driverContext,
      pickupPoint: alert.pickupPoint ?? relatedRideGroup?.pickupPoint ?? null,
    };
  }), [alerts, driverContextMap, rideGroupsWithRelations]);

  const conflictsByTripId = useMemo(
    () => groupConflictsByTrip(backendConflicts),
    [backendConflicts],
  );

  const rideGroupOperationalViews = useMemo(
    () => rideGroupsWithRelations.map((group) => mapRideGroupToOperationalViewModel(
      group,
      alertsWithRelations,
      decisionDrivers,
      auditEntries,
      conflictsByTripId.get(String(group.tripId)) ?? [],
      conflictSyncState.status,
    )),
    [alertsWithRelations, auditEntries, conflictSyncState.status, conflictsByTripId, decisionDrivers, rideGroupsWithRelations],
  );

  const alertsWithDecisionSupport = useMemo(() => alertsWithRelations.map((alert) => {
    const relatedRideGroup = rideGroupOperationalViews.find((group) => group.id === alert.relatedGroupId) ?? null;
    const decision = evaluateAlert(alert, relatedRideGroup);
    return {
      ...alert,
      relatedRideGroup,
      priorityScore: decision.priorityScore,
      recommendations: decision.recommendations,
    };
  }), [alertsWithRelations, rideGroupOperationalViews]);

  const selectedRideGroup = useMemo(
    () => rideGroupOperationalViews.find((group) => group.tripId === selectedRideGroupId) ?? null,
    [rideGroupOperationalViews, selectedRideGroupId],
  );

  const selectedAlert = useMemo(
    () => alertsWithDecisionSupport.find((alert) => alert.id === selectedAlertId) ?? null,
    [alertsWithDecisionSupport, selectedAlertId],
  );

  const availableDriverOptions = useMemo(
    () => buildAvailableDriverOptions(decisionDrivers, rideGroupOperationalViews, selectedRideGroup?.id ?? null),
    [decisionDrivers, rideGroupOperationalViews, selectedRideGroup],
  );

  const availableVehicleOptions = useMemo(
    () => buildAvailableVehicleOptions(backendFeedVehicles, rideGroupOperationalViews, selectedRideGroup?.id ?? null),
    [backendFeedVehicles, rideGroupOperationalViews, selectedRideGroup],
  );

  const dashboardStats = useMemo(() => {
    if (backendOverview?.summary) {
      const summary = backendOverview.summary;
      return [
        {
          label: 'Active Ride Groups',
          value: formatCount(summary.activeRideGroups ?? 0),
          support: `${summary.activeRideGroups ?? 0} active from Mongo-backed trip records with ${summary.movingRideGroups ?? 0} already moving.`,
          context: backendOverviewState.status === 'ready' ? 'Live backend data' : 'Backend sync in progress',
        },
        {
          label: 'Waiting / Unmatched Riders',
          value: formatCount(summary.waitingUnmatchedRiders ?? 0),
          support: `${summary.waitingUnmatchedRiders ?? 0} riders or open requests still need assignment.`,
          context: 'Live backend data',
        },
        {
          label: 'Active Drivers',
          value: formatCount(summary.activeDrivers ?? 0),
          support: `${summary.activeDrivers ?? 0} driver records are currently active in Mongo.`,
          context: `${summary.stagedDrivers ?? 0} staged / available`,
        },
        {
          label: 'Critical Alerts',
          value: formatCount(summary.criticalAlerts ?? 0),
          support: `${summary.criticalAlerts ?? 0} critical incidents or conflicts currently need attention.`,
          context: `${summary.flaggedGroups ?? 0} groups flagged`,
        },
      ];
    }

    return [
      {
        label: 'Active Ride Groups',
        value: '0',
        support: 'Live backend summary is unavailable, so ride totals cannot be verified right now.',
        context: 'Backend data unavailable',
      },
      {
        label: 'Waiting / Unmatched Riders',
        value: '0',
        support: 'Waiting rider totals are unavailable until the backend overview loads.',
        context: 'Backend data unavailable',
      },
      {
        label: 'Active Drivers',
        value: '0',
        support: 'Driver totals are unavailable until the backend overview loads.',
        context: 'Backend data unavailable',
      },
      {
        label: 'Critical Alerts',
        value: '0',
        support: 'Critical alert totals are unavailable until the backend overview loads.',
        context: 'Backend data unavailable',
      },
    ];
  }, [alertsWithDecisionSupport, backendOverview, backendOverviewState.status, rideGroupOperationalViews]);

  const dashboardRideGroups = useMemo(
    () => [...rideGroupOperationalViews].filter((group) => group.status !== 'Completed').sort(byNewest).slice(0, 7),
    [rideGroupOperationalViews],
  );

  const dashboardAlerts = useMemo(
    () => [...alertsWithDecisionSupport].filter((alert) => alert.status !== 'Resolved').sort(byAlertPriority).slice(0, 4),
    [alertsWithDecisionSupport],
  );

  const rideGroupSummaries = useMemo(() => ([
    { label: 'Total active groups', value: rideGroupOperationalViews.filter((group) => !['Completed', 'Cancelled'].includes(group.status)).length },
    { label: 'Open groups', value: rideGroupOperationalViews.filter((group) => ['Open', 'Filling'].includes(group.status)).length },
    { label: 'Full groups', value: rideGroupOperationalViews.filter((group) => group.status === 'Full').length },
    { label: 'Flagged groups', value: rideGroupOperationalViews.filter((group) => group.status === 'Flagged' || group.interventionState === 'Needs Review').length },
  ]), [rideGroupOperationalViews]);

  const alertSummaries = useMemo(() => ([
    { label: 'Critical alerts', value: alertsWithDecisionSupport.filter((alert) => alert.severity === 'Critical' && alert.status !== 'Resolved').length },
    { label: 'Warnings', value: alertsWithDecisionSupport.filter((alert) => alert.severity === 'Warning' && alert.status !== 'Resolved').length },
    { label: 'Monitoring only', value: alertsWithDecisionSupport.filter((alert) => alert.severity === 'Monitoring' && alert.status !== 'Resolved').length },
    { label: 'Resolved today', value: alertsWithDecisionSupport.filter((alert) => alert.status === 'Resolved' || alert.resolvedToday).length },
  ]), [alertsWithDecisionSupport]);

  const driverExceptionSummary = useMemo(() => {
    const delayedUnits = rideGroupOperationalViews.filter((group) => group.driverContext?.operationalState?.toLowerCase().includes('delayed')).length;
    const stoppedReportingUnits = rideGroupOperationalViews.filter((group) => group.driverContext?.operationalState?.toLowerCase().includes('stopped reporting')).length;
    const awaitingReassignment = alertsWithDecisionSupport.filter((alert) => alert.title.toLowerCase().includes('driver reassignment')).length;
    const awaitingDepartureReadiness = rideGroupOperationalViews.filter((group) => !['Departed', 'Ready on dispatch release'].includes(group.departureReadinessDetail?.readinessEstimate) && !['Completed', 'Cancelled', 'En Route'].includes(group.status)).length;
    const conflictRideGroups = rideGroupOperationalViews
      .filter((group) => group.hasActiveConflicts)
      .sort((a, b) => (
        Number(b.hasBlockingConflicts) - Number(a.hasBlockingConflicts)
        || getConflictSeverityRank(b.highestConflictSeverity) - getConflictSeverityRank(a.highestConflictSeverity)
        || (b.activeConflictCount ?? 0) - (a.activeConflictCount ?? 0)
        || (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
      ))
      .slice(0, 3);

    return {
      delayedUnits,
      stoppedReportingUnits,
      awaitingReassignment,
      awaitingDepartureReadiness,
      conflictRideGroups,
      relatedAlerts: alertsWithDecisionSupport
        .filter((alert) => alert.assignedDriver || alert.title.toLowerCase().includes('driver'))
        .filter((alert) => alert.status !== 'Resolved')
        .sort((a, b) => (
          Number(b.relatedRideGroup?.hasBlockingConflicts) - Number(a.relatedRideGroup?.hasBlockingConflicts)
          || getConflictSeverityRank(b.relatedRideGroup?.highestConflictSeverity) - getConflictSeverityRank(a.relatedRideGroup?.highestConflictSeverity)
          || (b.relatedRideGroup?.activeConflictCount ?? 0) - (a.relatedRideGroup?.activeConflictCount ?? 0)
          || (b.relatedRideGroup?.priorityScore ?? 0) - (a.relatedRideGroup?.priorityScore ?? 0)
          || (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
          || byAlertPriority(a, b)
        ))
        .slice(0, 3),
    };
  }, [alertsWithDecisionSupport, rideGroupOperationalViews]);

  const liveMapResolved = useMemo(() => {
    if (backendOverview?.map) {
      const backendViewport = backendOverview.map.viewport ?? null;
      const conflictViewport = deriveConflictMapViewport(conflictIntelZones);
      return {
        center: conflictViewport?.center ?? backendViewport?.center ?? DEFAULT_LIVE_MAP_DATA.center,
        zoom: conflictViewport ? 6 : (backendViewport ? 11 : DEFAULT_LIVE_MAP_DATA.zoom),
        bounds: conflictViewport?.bounds ?? backendViewport?.bounds ?? null,
        rideGroups: Array.isArray(backendOverview.map.rideGroups) ? backendOverview.map.rideGroups : [],
        drivers: Array.isArray(backendOverview.map.drivers) ? backendOverview.map.drivers : [],
        pickupPoints: Array.isArray(backendOverview.map.pickupPoints) ? backendOverview.map.pickupPoints : [],
        zones: Array.isArray(backendOverview.map.zones) ? backendOverview.map.zones : [],
        conflictZones: conflictIntelZones,
        conflictCountries: deriveConflictCountryItems(conflictIntelZones),
        alertAreas: Array.isArray(backendOverview.map.alertAreas) ? backendOverview.map.alertAreas : [],
        sceneMode: 'backend-operations',
      };
    }

    const rideGroupMap = new Map(rideGroupOperationalViews.map((group) => [group.id, group]));
    const alertMap = new Map(alertsWithDecisionSupport.map((alert) => [alert.id, alert]));

    const resolvedRideGroups = DEFAULT_LIVE_MAP_DATA.mapRideGroups.map((item) => ({
      ...item,
      rideGroup: rideGroupMap.get(item.id),
    })).filter((item) => item.rideGroup);

    const resolvedDrivers = DEFAULT_LIVE_MAP_DATA.mapDrivers.map((item) => ({
      ...item,
      rideGroup: rideGroupMap.get(item.assignedRideGroupId) ?? null,
    }));

    const resolvedPickupPoints = DEFAULT_LIVE_MAP_DATA.mapPickupPoints.map((item) => ({
      ...item,
      rideGroups: item.activeRideGroupIds.map((id) => rideGroupMap.get(id)).filter(Boolean),
    }));

    const resolvedZones = DEFAULT_LIVE_MAP_DATA.mapZones.map((item) => ({
      ...item,
      rideGroups: item.affectedRideGroupIds.map((id) => rideGroupMap.get(id)).filter(Boolean),
      alerts: item.relatedAlertIds.map((id) => alertMap.get(id)).filter(Boolean),
    }));

    const resolvedAlertAreas = DEFAULT_LIVE_MAP_DATA.mapAlertAreas.map((item) => ({
      ...item,
      alert: alertMap.get(item.alertId) ?? null,
      rideGroup: item.relatedRideGroupId ? rideGroupMap.get(item.relatedRideGroupId) ?? null : null,
    })).filter((item) => item.alert);

    const resolvedConflictZones = conflictIntelZones.map((zone) => ({
      ...zone,
      affectedRideGroups: rideGroupOperationalViews.filter((group) => (
        group.zone === zone.metadata?.zoneName
        || group.linkedAlerts?.some((alert) => alert.relatedZone === zone.metadata?.zoneName)
      )).slice(0, 5),
    }));
    const conflictCountries = deriveConflictCountryItems(resolvedConflictZones);

    const conflictViewport = deriveConflictMapViewport(resolvedConflictZones);

    return {
      center: conflictViewport?.center ?? DEFAULT_LIVE_MAP_DATA.center,
      zoom: conflictViewport ? 6 : DEFAULT_LIVE_MAP_DATA.zoom,
      bounds: conflictViewport?.bounds ?? null,
      rideGroups: resolvedRideGroups,
      drivers: resolvedDrivers,
      pickupPoints: resolvedPickupPoints,
      zones: resolvedZones,
      conflictZones: resolvedConflictZones,
      conflictCountries,
      alertAreas: resolvedAlertAreas,
      sceneMode: conflictIntelState.status === 'ready' && conflictIntelZones.length > 0 ? 'hybrid-operations' : 'fallback-operations',
    };
  }, [alertsWithDecisionSupport, backendOverview, conflictIntelState.status, conflictIntelZones, rideGroupOperationalViews]);

  const filteredLiveMapData = useMemo(() => {
    const zoneMatch = (zoneValue) => mapFilters.zone === 'All' || zoneValue === mapFilters.zone;
    const statusMatch = (statusValue) => mapFilters.status === 'All' || statusValue === mapFilters.status;
    const visibleAlertAreas = liveMapResolved.alertAreas.filter((item) => {
      const alert = item.alert;
      if (!alert) return false;
      if (!zoneMatch(item.zone)) return false;
      if (!statusMatch(alert.status === 'Resolved' ? 'Resolved' : alert.severity)) return false;
      return true;
    });

    return {
      ...liveMapResolved,
      rideGroups: mapFilters.showRideGroups
        ? liveMapResolved.rideGroups.filter((item) => zoneMatch(item.rideGroup.zone) && statusMatch(item.rideGroup.status))
        : [],
      drivers: mapFilters.showDrivers
        ? liveMapResolved.drivers.filter((item) => zoneMatch(item.zone) && statusMatch(item.rideGroup?.status ?? 'All'))
        : [],
      pickupPoints: mapFilters.showPickupPoints
        ? liveMapResolved.pickupPoints.filter((item) => zoneMatch(item.zone))
        : [],
      zones: mapFilters.showRestrictedZones
        ? liveMapResolved.zones.filter((item) => zoneMatch(item.zone))
        : [],
      conflictZones: mapFilters.showConflictZones
        ? liveMapResolved.conflictZones.filter((item) => statusMatch(item.riskLabel) || mapFilters.status === 'All')
        : [],
      conflictCountries: mapFilters.showConflictZones ? liveMapResolved.conflictCountries : [],
      alertAreas: mapFilters.showAlerts ? visibleAlertAreas : [],
    };
  }, [liveMapResolved, mapFilters]);

  const liveMapSummaries = useMemo(() => {
    if (backendOverview?.summary?.map) {
      return [
        { label: 'Active groups on map', value: backendOverview.summary.map.activeGroups ?? 0 },
        { label: 'Tracked drivers', value: backendOverview.summary.map.trackedDrivers ?? 0 },
        { label: 'Active pickup points', value: backendOverview.summary.map.activePickupPoints ?? 0 },
        { label: 'Restricted zones', value: backendOverview.summary.map.restrictedZones ?? 0 },
        { label: 'Danger zones', value: backendOverview.summary.map.dangerZones ?? 0 },
        { label: 'Map-linked alerts', value: backendOverview.summary.map.mapLinkedAlerts ?? 0 },
      ];
    }

    return [
      { label: 'Active groups on map', value: filteredLiveMapData.rideGroups.length },
      { label: 'Tracked drivers', value: filteredLiveMapData.drivers.length },
      { label: 'Active pickup points', value: filteredLiveMapData.pickupPoints.length },
      { label: 'Restricted zones', value: filteredLiveMapData.zones.length },
      { label: 'Danger zones', value: filteredLiveMapData.conflictZones.length },
      { label: 'Map-linked alerts', value: filteredLiveMapData.alertAreas.filter((item) => item.alert?.status !== 'Resolved').length },
    ];
  }, [backendOverview, filteredLiveMapData]);

  const selectedMapItemData = useMemo(() => {
    if (!selectedMapItem) return null;
    if (selectedMapItem.type === 'rideGroup') {
      const item = liveMapResolved.rideGroups.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'rideGroup', item } : null;
    }
    if (selectedMapItem.type === 'driver') {
      const item = liveMapResolved.drivers.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'driver', item } : null;
    }
    if (selectedMapItem.type === 'pickup') {
      const item = liveMapResolved.pickupPoints.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'pickup', item } : null;
    }
    if (selectedMapItem.type === 'zone') {
      const item = liveMapResolved.zones.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'zone', item } : null;
    }
    if (selectedMapItem.type === 'conflictZone') {
      const item = liveMapResolved.conflictZones.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'conflictZone', item } : null;
    }
    if (selectedMapItem.type === 'conflictCountry') {
      const item = liveMapResolved.conflictCountries.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'conflictCountry', item } : null;
    }
    if (selectedMapItem.type === 'alertArea') {
      const item = liveMapResolved.alertAreas.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'alertArea', item } : null;
    }
    return null;
  }, [liveMapResolved, selectedMapItem]);

  useEffect(() => {
    if (!selectedMapItem) return;
    if (selectedMapItemData) return;
    setSelectedMapItem(null);
  }, [selectedMapItem, selectedMapItemData]);

  function openRideGroup(target) {
    const rideGroup = typeof target === 'object' && target
      ? rideGroupsWithRelations.find((group) => group.tripId === target.tripId || group.id === target.id)
      : rideGroupsWithRelations.find((group) => (
        group.tripId === target
        || group.requestId === target
        || group.id === target
      ));
    if (!rideGroup) return;
    setSelectedAlertId(null);
    setSelectedRideGroupId(rideGroup.tripId);
  }

  function openAlert(id) {
    setSelectedRideGroupId(null);
    setSelectedAlertId(id);
  }

  function openAlertOnMap(alertId) {
    const area = liveMapResolved.alertAreas.find((item) => item.alertId === alertId);
    if (area) {
      setSelectedMapItem({ type: 'alertArea', id: area.id });
      return;
    }
    const alert = alertsWithDecisionSupport.find((item) => item.id === alertId);
    if (!alert?.relatedZone) return;
    const zone = liveMapResolved.zones.find((item) => item.zone === alert.relatedZone);
    if (zone) setSelectedMapItem({ type: 'zone', id: zone.id });
  }

  function closeDetails() {
    setSelectedRideGroupId(null);
    setSelectedAlertId(null);
  }

  function selectMapItem(type, id) {
    setSelectedMapItem({ type, id });
  }

  function clearMapSelection() {
    setSelectedMapItem(null);
  }

  function updateRideGroup(id, updates) {
    setRideGroups((current) => current.map((group) => (
      group.id === id
        ? { ...group, ...updates, updatedAt: new Date().toISOString() }
        : group
    )));
  }

  function updateAlert(id, updates) {
    setAlerts((current) => current.map((alert) => (
      alert.id === id
        ? { ...alert, ...updates }
        : alert
    )));
  }

  function updateAlertsForRideGroup(rideGroupId, updater) {
    setAlerts((current) => current.map((alert) => {
      if (alert.relatedGroupId !== rideGroupId) return alert;
      const nextUpdates = updater(alert);
      return nextUpdates ? { ...alert, ...nextUpdates } : alert;
    }));
  }

  function appendActivity({ title, description, meta = '' }) {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    setActivity((current) => [
      {
        id: `activity-${Date.now()}`,
        time,
        title,
        description,
        meta,
      },
      ...current,
    ].slice(0, 12));
  }

  function appendAudit({
    rideGroupId,
    tripId,
    actionType,
    description,
    note = '',
    entityType = 'trip',
    entityId = null,
    actor = 'Maya Chen',
  }) {
    setAuditEntries((current) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        actionType,
        actor,
        note,
        description,
        timestamp: new Date().toISOString(),
        entityType,
        entityId: entityId ?? tripId ?? rideGroupId,
        rideGroupId,
        tripId,
      },
      ...current,
    ]);
  }

  function updateRideGroupAssignment(rideGroupId, updates) {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    if (!rideGroup) return;

    updateRideGroup(rideGroupId, {
      ...updates,
      schemaRefs: {
        ...rideGroup.schemaRefs,
        ...(updates.schemaRefs ?? {}),
      },
      schemaStatus: {
        ...rideGroup.schemaStatus,
        ...(updates.schemaStatus ?? {}),
      },
      schemaSnapshot: {
        ...rideGroup.schemaSnapshot,
        ...(updates.schemaSnapshot ?? {}),
      },
    });
  }

  function assignRideGroupDriver(rideGroupId, driverUserId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    const driver = decisionDrivers.find((item) => item.userId === driverUserId);
    if (!rideGroup || !driver) return;

    const driverUser = usersById.get(driverUserId);
    const vehicle = driver.vehicleId ? vehiclesById.get(driver.vehicleId) ?? null : null;
    const unitId = driver.unitId ?? (vehicle ? `Unit ${vehicle._id.split('-')[1].toUpperCase()}` : null);

    updateRideGroupAssignment(rideGroupId, {
      driverUserId,
      driver: unitId ?? driverUser?.fullName ?? 'Assigned',
      driverUnitId: unitId,
      vehicle: rideGroup.vehicleId ? rideGroup.vehicle : (vehicle?.label ?? rideGroup.vehicle),
      schemaRefs: {
        driverUserId,
      },
      schemaStatus: {
        driver: 'assigned',
        trip: 'driver_assigned',
        request: 'assigned',
      },
      schemaSnapshot: {
        driver: {
          ...driver,
          status: 'assigned',
        },
        driverUser,
      },
      departureReadiness: vehicle
        ? 'Driver assigned and awaiting final readiness confirmation'
        : 'Driver assigned, vehicle assignment still required',
      departureReadinessDetail: {
        ...rideGroup.departureReadinessDetail,
        driverAssigned: 'Yes',
        readinessEstimate: vehicle ? 'Pending final confirmation' : 'Pending vehicle assignment',
      },
      summary: `Ride Group ${rideGroupId} now has ${driverUser?.fullName ?? 'an assigned driver'} attached at ${rideGroup.pickupPoint}.`,
    });

    appendActivity({
      title: `${rideGroupId} driver assigned`,
      description: `${driverUser?.fullName ?? 'Assigned driver'} was assigned to the ride group.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: rideGroup.driverAssignment?.assigned ? 'driver_reassigned' : 'driver_assigned',
      description: `${driverUser?.fullName ?? 'Assigned driver'} ${rideGroup.driverAssignment?.assigned ? 'reassigned to' : 'assigned to'} ${rideGroupId}.`,
      note,
    });
  }

  function assignRideGroupVehicle(rideGroupId, vehicleId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    const vehicle = vehiclesById.get(vehicleId);
    if (!rideGroup || !vehicle) return;

    updateRideGroupAssignment(rideGroupId, {
      vehicleId,
      vehicle: vehicle.label,
      capacity: vehicle.seatCapacity ?? rideGroup.capacity,
      schemaRefs: {
        vehicleId,
      },
      schemaSnapshot: {
        vehicle,
      },
      departureReadiness: rideGroup.schemaRefs?.driverUserId
        ? 'Vehicle assigned and awaiting final readiness confirmation'
        : 'Vehicle assigned, driver assignment still required',
      departureReadinessDetail: {
        ...rideGroup.departureReadinessDetail,
        readinessEstimate: rideGroup.schemaRefs?.driverUserId ? 'Pending final confirmation' : 'Pending driver assignment',
      },
      summary: `Ride Group ${rideGroupId} now has ${vehicle.label} allocated for dispatch from ${rideGroup.pickupPoint}.`,
    });

    appendActivity({
      title: `${rideGroupId} vehicle assigned`,
      description: `${vehicle.label} was assigned to the ride group.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: rideGroup.schemaRefs?.vehicleId ? 'vehicle_reassigned' : 'vehicle_assigned',
      description: `${vehicle.label} ${rideGroup.schemaRefs?.vehicleId ? 'reassigned to' : 'assigned to'} ${rideGroupId}.`,
      note,
    });
  }

  function resolveRideGroupAlerts(rideGroupId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    if (!rideGroup) return;

    updateAlertsForRideGroup(rideGroupId, (alert) => ({
      status: 'Resolved',
      resolvedToday: true,
    }));
    appendActivity({
      title: `${rideGroupId} alerts resolved`,
      description: `Operator resolved active alerts linked to the ride group.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: 'alert_resolved',
      description: `Linked alerts were marked resolved for ${rideGroupId}.`,
      note,
    });
  }

  function escalateRideGroupAlerts(rideGroupId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    if (!rideGroup) return;

    updateAlertsForRideGroup(rideGroupId, (alert) => ({
      status: alert.status === 'Resolved' ? 'Open' : 'In Review',
    }));
    appendActivity({
      title: `${rideGroupId} alerts escalated`,
      description: `Operator escalated linked alerts for continued review.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: 'alert_escalated',
      description: `Linked alerts were escalated for ${rideGroupId}.`,
      note,
    });
  }

  function completeRideGroupReadinessCheck(rideGroupId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    if (!rideGroup) return;

    const hasDriver = Boolean(rideGroup.schemaRefs?.driverUserId);
    const hasVehicle = Boolean(rideGroup.schemaRefs?.vehicleId);
    const readinessEstimate = hasDriver && hasVehicle ? 'Pending dispatch release' : 'Pending assignment completion';

    updateRideGroupAssignment(rideGroupId, {
      departureReadiness: hasDriver && hasVehicle ? 'Readiness reviewed by operator' : 'Readiness reviewed; assignments still incomplete',
      departureReadinessDetail: {
        ...rideGroup.departureReadinessDetail,
        driverAssigned: hasDriver ? 'Yes' : 'No',
        minimumRidersReached: 'Yes',
        riderCheckIn: `${rideGroup.ridersJoined} of ${rideGroup.capacity} confirmed`,
        routeAdvisory: 'Operator reviewed active blockers',
        readinessEstimate,
      },
    });

    appendActivity({
      title: `${rideGroupId} readiness reviewed`,
      description: `Operator reviewed readiness blockers and updated sub-checks.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: 'readiness_updated',
      description: `Readiness checks were updated for ${rideGroupId}.`,
      note,
    });
  }

  function reviewRideGroupBlockers(rideGroupId, note = '') {
    const rideGroup = rideGroupsWithRelations.find((group) => group.id === rideGroupId);
    if (!rideGroup) return;

    updateRideGroup(rideGroupId, {
      status: rideGroup.status === 'Flagged' ? rideGroup.status : 'Flagged',
      interventionState: 'Needs Review',
      departureReadiness: 'Blocked conditions under operator review',
    });
    appendActivity({
      title: `${rideGroupId} blockers reviewed`,
      description: `Operator opened a blocker review for the ride group.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: 'blockers_reviewed',
      description: `Operational blockers were reviewed for ${rideGroupId}.`,
      note,
    });
  }

  function markRideGroupDispatchReady(rideGroupId, note = '') {
    const rideGroup = rideGroupOperationalViews.find((group) => group.id === rideGroupId);
    if (!rideGroup) return { ok: false, error: 'Ride group unavailable' };

    const hasDriver = Boolean(rideGroup.driverAssignment?.assigned);
    const hasVehicle = Boolean(rideGroup.schemaRefs?.vehicleId);
    const hasCriticalAlert = rideGroup.linkedAlerts?.some((alert) => alert.status !== 'Resolved' && alert.severity === 'Critical');
    const blocked = rideGroup.readinessState === 'BLOCKED' || rideGroup.actionState === 'BLOCKED';

    if (!hasDriver || !hasVehicle || hasCriticalAlert || blocked) {
      return { ok: false, error: 'Ride group is not eligible for dispatch readiness yet.' };
    }

    updateRideGroupAssignment(rideGroupId, {
      interventionState: 'Monitoring',
      departureReadiness: 'Ready on dispatch release',
      departureReadinessDetail: {
        ...rideGroup.departureReadinessDetail,
        driverAssigned: 'Yes',
        minimumRidersReached: 'Yes',
        riderCheckIn: `${rideGroup.ridersJoined} of ${rideGroup.capacity} confirmed`,
        readinessEstimate: 'Ready on dispatch release',
      },
      summary: `Ride Group ${rideGroupId} is dispatch ready from ${rideGroup.pickupPoint} after operator validation.`,
    });

    appendActivity({
      title: `${rideGroupId} marked dispatch ready`,
      description: `Operator validated assignments and cleared the ride group for dispatch release.`,
      meta: note || `${rideGroup.pickupPoint} · ${rideGroup.zone}`,
    });
    appendAudit({
      rideGroupId,
      tripId: rideGroup.tripId,
      actionType: 'dispatch_ready_marked',
      description: `${rideGroupId} was marked dispatch ready.`,
      note,
    });
    return { ok: true };
  }

  function runRideGroupAction(action, rideGroupId) {
    const group = rideGroupsWithRelations.find((item) => item.id === rideGroupId);
    if (!group) return;

    if (action === 'Close Joining') {
      updateRideGroup(rideGroupId, {
        status: 'Full',
        interventionState: 'Monitoring',
        departureReadinessDetail: {
          ...group.departureReadinessDetail,
          riderCheckIn: `${group.ridersJoined} of ${group.capacity} confirmed`,
          routeAdvisory: group.departureReadinessDetail?.routeAdvisory ?? 'Route under routine review',
          readinessEstimate: 'Ready on dispatch release',
        },
        departureReadiness: 'Ready on dispatch release',
        summary: `Ride Group ${rideGroupId} is closed for joining at ${group.pickupPoint} and awaiting final dispatch release in ${group.zone}.`,
      });
      updateAlertsForRideGroup(rideGroupId, (alert) => {
        if (alert.status === 'Resolved') return null;
        return { status: 'Monitoring' };
      });
      appendActivity({
        title: `${rideGroupId} closed for joining`,
        description: `Admin closed new rider intake and marked the group ready for dispatch review.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Reopen Group') {
      const reopenedStatus = getReopenedStatus(group);
      updateRideGroup(rideGroupId, {
        status: reopenedStatus,
        interventionState: 'Monitoring',
        departureReadinessDetail: {
          ...group.departureReadinessDetail,
          riderCheckIn: `${group.ridersJoined} of ${group.capacity} confirmed`,
          readinessEstimate: 'Awaiting additional riders',
        },
        departureReadiness: 'Awaiting additional riders before dispatch review',
        summary: `Ride Group ${rideGroupId} was reopened for joining at ${group.pickupPoint} and is absorbing additional riders in ${group.zone}.`,
        statusBeforeFlag: null,
      });
      updateAlertsForRideGroup(rideGroupId, (alert) => ({
        status: alert.severity === 'Critical' ? 'In Review' : 'Open',
      }));
      appendActivity({
        title: `${rideGroupId} reopened for joining`,
        description: `Admin reopened the ride group to absorb additional riders in the current corridor cycle.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Mark Flagged') {
      updateRideGroup(rideGroupId, {
        status: 'Flagged',
        interventionState: 'Needs Review',
        departureReadiness: 'Held for operations review',
        summary: `Ride Group ${rideGroupId} is flagged at ${group.pickupPoint} and now requires operator review before movement resumes in ${group.zone}.`,
        statusBeforeFlag: group.status === 'Flagged' ? (group.statusBeforeFlag ?? 'Filling') : group.status,
      });
      updateAlertsForRideGroup(rideGroupId, (alert) => ({
        status: alert.status === 'Resolved' ? 'In Review' : 'In Review',
      }));
      appendActivity({
        title: `${rideGroupId} marked flagged by admin`,
        description: `Operational review was requested for the group due to changing corridor conditions.`,
        meta: `${group.driver ?? 'No driver'} · ${group.zone}`,
      });
    }
    if (action === 'Resolve Flag') {
      const restoredStatus = group.statusBeforeFlag ?? getReopenedStatus(group);
      updateRideGroup(rideGroupId, {
        status: restoredStatus,
        interventionState: 'Monitoring',
        departureReadiness: restoredStatus === 'Full' ? 'Ready on dispatch release' : 'Returned to monitored filling state',
        summary: `Ride Group ${rideGroupId} returned to active monitoring at ${group.pickupPoint} after the flagged condition was cleared.`,
        statusBeforeFlag: null,
      });
      updateAlertsForRideGroup(rideGroupId, (alert) => ({
        status: alert.severity === 'Critical' ? 'Monitoring' : 'Resolved',
        resolvedToday: alert.severity === 'Critical' ? alert.resolvedToday : true,
      }));
      appendActivity({
        title: `${rideGroupId} flag resolved`,
        description: `Admin cleared the active flag after reviewing route and pickup readiness notes.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Cancel Group') {
      updateRideGroup(rideGroupId, {
        status: 'Cancelled',
        interventionState: 'Action Taken',
        departureReadiness: 'Cancelled by admin',
        summary: `Ride Group ${rideGroupId} was cancelled and removed from active monitoring at ${group.pickupPoint}.`,
      });
      updateAlertsForRideGroup(rideGroupId, () => ({
        status: 'Resolved',
        resolvedToday: true,
      }));
      appendActivity({
        title: `${rideGroupId} cancelled`,
        description: `The ride group was removed from active monitoring and marked cancelled.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
  }

  function requestRideGroupAction(action, rideGroupId) {
    if (action === 'Cancel Group') {
      setConfirmation({
        title: `Cancel ${rideGroupId}?`,
        description: 'This action removes the group from active monitoring and marks the operational record as cancelled.',
        confirmLabel: 'Cancel Group',
        onConfirm: () => {
          runRideGroupAction(action, rideGroupId);
          closeConfirmation();
          closeDetails();
        },
      });
      return;
    }

    runRideGroupAction(action, rideGroupId);
  }

  function closeConfirmation() {
    setConfirmation(null);
  }

  function markAlertStatus(alertId, status) {
    const alert = alertsWithDecisionSupport.find((item) => item.id === alertId);
    updateAlert(alertId, { status, resolvedToday: status === 'Resolved' ? true : undefined });
    if (alert) {
      appendActivity({
        title: `${alert.code ?? alert.id} moved to ${status}`,
        description: `Admin updated ${alert.title.toLowerCase()} to ${status.toLowerCase()} for continued exception handling.`,
        meta: `${alert.relatedGroupId ?? alert.relatedZone}`,
      });
    }
  }

  function focusMapOnRideGroup(rideGroupId) {
    const item = liveMapResolved.rideGroups.find((entry) => entry.id === rideGroupId);
    if (!item) return;
    setSelectedMapItem({ type: 'rideGroup', id: rideGroupId });
  }

  function openMapRideGroupDetails(rideGroupId) {
    if (!rideGroupId) return;
    openRideGroup(rideGroupId);
  }

  function openMapAlertDetails(alertId) {
    if (!alertId) return;
    openAlert(alertId);
  }

  const value = useMemo(() => ({
    operationsMap,
    liveMapData: filteredLiveMapData,
    liveMapBase: liveMapResolved,
    liveMapSummaries,
    mapFilters,
    setMapFilters,
    selectedMapItem,
    selectedMapItemData,
    activity,
    rideGroups: rideGroupOperationalViews,
    rawRideGroups: rideGroups,
    alerts: alertsWithDecisionSupport,
    rawAlerts: alerts,
    driverContextMap,
    driverExceptionSummary,
    rideGroupOperationalViews,
    availableDriverOptions,
    availableVehicleOptions,
    auditEntries,
    conflictSyncState,
    alertsDataState,
    dashboardStats,
    dashboardRideGroups,
    dashboardAlerts,
    rideGroupSummaries,
    alertSummaries,
    selectedRideGroup,
    selectedAlert,
    confirmation,
    openRideGroup,
    openAlert,
    closeDetails,
    selectMapItem,
    clearMapSelection,
    closeConfirmation,
    requestRideGroupAction,
    assignRideGroupDriver,
    assignRideGroupVehicle,
    resolveRideGroupAlerts,
    escalateRideGroupAlerts,
    completeRideGroupReadinessCheck,
    reviewRideGroupBlockers,
    markRideGroupDispatchReady,
    markAlertStatus,
    focusMapOnRideGroup,
    openMapRideGroupDetails,
    openMapAlertDetails,
    openAlertOnMap,
    openRelatedRideGroupFromAlert(alertId) {
      const alert = alertsWithDecisionSupport.find((item) => item.id === alertId);
      if (!alert?.relatedGroupId) return;
      openRideGroup(alert.relatedGroupId);
    },
  }), [
    activity,
    alerts,
    alertsWithDecisionSupport,
    confirmation,
    dashboardAlerts,
    dashboardRideGroups,
    dashboardStats,
    filteredLiveMapData,
    liveMapResolved,
    liveMapSummaries,
    mapFilters,
    driverContextMap,
    driverExceptionSummary,
    availableDriverOptions,
    availableVehicleOptions,
    auditEntries,
    conflictSyncState,
    alertsDataState,
    rideGroupSummaries,
    alertSummaries,
    rideGroups,
    rideGroupsWithRelations,
    rideGroupOperationalViews,
    selectedAlert,
    selectedMapItem,
    selectedMapItemData,
    selectedRideGroup,
  ]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const value = useContext(OperationsContext);
  if (!value) throw new Error('useOperations must be used within OperationsProvider');
  return value;
}
