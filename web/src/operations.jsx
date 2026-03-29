import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import { auditLogs as initialAuditLogs, driverContexts, drivers as rawDrivers, initialActivity, initialAlerts, initialRideGroups, liveMapData, operationsMap, users as mockUsers, vehicles as mockVehicles } from './mock/operations';
import {
  getConflictSeverityRank,
  getHighestConflictSeverity,
  groupConflictsByTrip,
  isAssignmentConflictType,
  sortConflictsByUrgency,
} from './utils/conflictDisplay';
import { buildRideGroupTimeline, evaluateAlert, evaluateRideGroup } from './utils/decisionEngine';

const OperationsContext = createContext(null);

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

function createAuditEntry(log, usersById, rideGroupsByTripId) {
  const relatedRideGroup = rideGroupsByTripId.get(log.entityId) ?? null;
  return {
    id: log._id,
    actionType: log.action,
    actor: usersById.get(log.actorUserId)?.fullName ?? 'Operations Admin',
    note: log.metadata?.description ?? '',
    description: log.metadata?.title ?? log.action,
    timestamp: log.createdAt,
    entityType: log.entityType,
    entityId: log.entityId,
    rideGroupId: relatedRideGroup?.id ?? null,
    tripId: log.entityType === 'trip' ? log.entityId : relatedRideGroup?.tripId ?? null,
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
  const [rideGroups, setRideGroups] = useState(initialRideGroups);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activity, setActivity] = useState(initialActivity);
  const [backendConflicts, setBackendConflicts] = useState([]);
  const [conflictSyncState, setConflictSyncState] = useState({ status: 'idle', error: '' });
  const [auditEntries, setAuditEntries] = useState(() => {
    const rideGroupsByTripId = new Map(initialRideGroups.map((group) => [group.tripId, group]));
    return initialAuditLogs.map((log) => createAuditEntry(log, new Map(mockUsers.map((user) => [user._id, user])), rideGroupsByTripId));
  });
  const [selectedRideGroupId, setSelectedRideGroupId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [mapFilters, setMapFilters] = useState({
    showRideGroups: true,
    showDrivers: true,
    showPickupPoints: true,
    showRestrictedZones: true,
    showAlerts: true,
    zone: 'All',
    status: 'All',
  });
  const [confirmation, setConfirmation] = useState(null);

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

  const usersById = useMemo(() => new Map(mockUsers.map((user) => [user._id, user])), []);
  const vehiclesById = useMemo(() => new Map(mockVehicles.map((vehicle) => [vehicle._id, vehicle])), []);

  const driverContextMap = useMemo(
    () => new Map(driverContexts.map((driver) => [driver.unitId, driver])),
    [],
  );

  const decisionDrivers = useMemo(() => rawDrivers.map((driver) => {
    const driverContext = driverContexts.find((context) => (
      context.unitId === `Unit ${driver.vehicleId?.split('-')[1]?.toUpperCase()}`
      || context.displayName === driver.schemaSnapshot?.driverUser?.fullName
    )) ?? null;

    return {
      ...driver,
      operationalState: driverContext?.operationalState ?? driver.status,
      unitId: driverContext?.unitId ?? null,
      displayName: driverContext?.displayName ?? null,
    };
  }), []);

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
    () => buildAvailableVehicleOptions(mockVehicles, rideGroupOperationalViews, selectedRideGroup?.id ?? null),
    [rideGroupOperationalViews, selectedRideGroup],
  );

  const dashboardStats = useMemo(() => {
    const activeGroups = rideGroupOperationalViews.filter((group) => !['Completed', 'Cancelled'].includes(group.status));
    const openGroups = activeGroups.filter((group) => ['Open', 'Filling'].includes(group.status));
    const flaggedGroups = activeGroups.filter((group) => group.status === 'Flagged' || group.interventionState === 'Needs Review');
    const criticalAlerts = alertsWithDecisionSupport.filter((alert) => alert.status !== 'Resolved' && alert.severity === 'Critical');

    return [
      {
        label: 'Active Ride Groups',
        value: formatCount(activeGroups.length),
        support: `${activeGroups.length} active across 4 pickup corridors with ${rideGroupOperationalViews.filter((group) => group.status === 'En Route').length} already moving.`,
        context: `${openGroups.length} still forming`,
      },
      {
        label: 'Waiting / Unmatched Riders',
        value: '7',
        support: 'Seven riders still need assignment before the next outbound staging cycle closes.',
        context: 'North and East corridors',
      },
      {
        label: 'Active Drivers',
        value: '19',
        support: 'Nineteen field units are checked in, with 4 currently loading and 2 in reassignment review.',
        context: '16 moving, 3 staged',
      },
      {
        label: 'Critical Alerts',
        value: formatCount(criticalAlerts.length),
        support: `${criticalAlerts.length} high-risk exceptions currently need manual review or action confirmation.`,
        context: `${flaggedGroups.length} groups flagged`,
      },
    ];
  }, [alertsWithDecisionSupport, rideGroupOperationalViews]);

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
    const rideGroupMap = new Map(rideGroupOperationalViews.map((group) => [group.id, group]));
    const alertMap = new Map(alertsWithDecisionSupport.map((alert) => [alert.id, alert]));

    const resolvedRideGroups = liveMapData.mapRideGroups.map((item) => ({
      ...item,
      rideGroup: rideGroupMap.get(item.id),
    })).filter((item) => item.rideGroup);

    const resolvedDrivers = liveMapData.mapDrivers.map((item) => ({
      ...item,
      rideGroup: rideGroupMap.get(item.assignedRideGroupId) ?? null,
    }));

    const resolvedPickupPoints = liveMapData.mapPickupPoints.map((item) => ({
      ...item,
      rideGroups: item.activeRideGroupIds.map((id) => rideGroupMap.get(id)).filter(Boolean),
    }));

    const resolvedZones = liveMapData.mapZones.map((item) => ({
      ...item,
      rideGroups: item.affectedRideGroupIds.map((id) => rideGroupMap.get(id)).filter(Boolean),
      alerts: item.relatedAlertIds.map((id) => alertMap.get(id)).filter(Boolean),
    }));

    const resolvedAlertAreas = liveMapData.mapAlertAreas.map((item) => ({
      ...item,
      alert: alertMap.get(item.alertId) ?? null,
      rideGroup: item.relatedRideGroupId ? rideGroupMap.get(item.relatedRideGroupId) ?? null : null,
    })).filter((item) => item.alert);

    return {
      center: liveMapData.center,
      zoom: liveMapData.zoom,
      rideGroups: resolvedRideGroups,
      drivers: resolvedDrivers,
      pickupPoints: resolvedPickupPoints,
      zones: resolvedZones,
      alertAreas: resolvedAlertAreas,
    };
  }, [alertsWithDecisionSupport, rideGroupOperationalViews]);

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
      alertAreas: mapFilters.showAlerts ? visibleAlertAreas : [],
    };
  }, [liveMapResolved, mapFilters]);

  const liveMapSummaries = useMemo(() => ([
    { label: 'Active groups on map', value: filteredLiveMapData.rideGroups.length },
    { label: 'Tracked drivers', value: filteredLiveMapData.drivers.length },
    { label: 'Active pickup points', value: filteredLiveMapData.pickupPoints.length },
    { label: 'Restricted zones', value: filteredLiveMapData.zones.length },
    { label: 'Map-linked alerts', value: filteredLiveMapData.alertAreas.filter((item) => item.alert?.status !== 'Resolved').length },
  ]), [filteredLiveMapData]);

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
    if (selectedMapItem.type === 'alertArea') {
      const item = liveMapResolved.alertAreas.find((entry) => entry.id === selectedMapItem.id);
      return item ? { type: 'alertArea', item } : null;
    }
    return null;
  }, [liveMapResolved, selectedMapItem]);

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
        description: 'This mock action removes the group from active monitoring and marks the operational record as cancelled.',
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
