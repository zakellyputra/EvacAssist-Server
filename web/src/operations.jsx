import { createContext, useContext, useMemo, useState } from 'react';
import { driverContexts, initialActivity, initialAlerts, initialRideGroups, liveMapData, operationsMap } from './mock/operations';

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

export function OperationsProvider({ children }) {
  const [rideGroups, setRideGroups] = useState(initialRideGroups);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activity, setActivity] = useState(initialActivity);
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

  const driverContextMap = useMemo(
    () => new Map(driverContexts.map((driver) => [driver.unitId, driver])),
    [],
  );

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

  const selectedRideGroup = useMemo(
    () => rideGroupsWithRelations.find((group) => group.id === selectedRideGroupId) ?? null,
    [rideGroupsWithRelations, selectedRideGroupId],
  );

  const selectedAlert = useMemo(
    () => alertsWithRelations.find((alert) => alert.id === selectedAlertId) ?? null,
    [alertsWithRelations, selectedAlertId],
  );

  const dashboardStats = useMemo(() => {
    const activeGroups = rideGroupsWithRelations.filter((group) => !['Completed', 'Cancelled'].includes(group.status));
    const openGroups = activeGroups.filter((group) => ['Open', 'Filling'].includes(group.status));
    const flaggedGroups = activeGroups.filter((group) => group.status === 'Flagged' || group.interventionState === 'Needs Review');
    const criticalAlerts = alertsWithRelations.filter((alert) => alert.status !== 'Resolved' && alert.severity === 'Critical');

    return [
      {
        label: 'Active Ride Groups',
        value: formatCount(activeGroups.length),
        support: `${activeGroups.length} active across 4 pickup corridors with ${rideGroupsWithRelations.filter((group) => group.status === 'En Route').length} already moving.`,
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
  }, [alertsWithRelations, rideGroupsWithRelations]);

  const dashboardRideGroups = useMemo(
    () => [...rideGroupsWithRelations].filter((group) => group.status !== 'Completed').sort(byNewest).slice(0, 7),
    [rideGroupsWithRelations],
  );

  const dashboardAlerts = useMemo(
    () => [...alertsWithRelations].filter((alert) => alert.status !== 'Resolved').sort(byAlertPriority).slice(0, 4),
    [alertsWithRelations],
  );

  const rideGroupSummaries = useMemo(() => ([
    { label: 'Total active groups', value: rideGroupsWithRelations.filter((group) => !['Completed', 'Cancelled'].includes(group.status)).length },
    { label: 'Open groups', value: rideGroupsWithRelations.filter((group) => group.status === 'Open').length },
    { label: 'Full groups', value: rideGroupsWithRelations.filter((group) => group.status === 'Full').length },
    { label: 'Flagged groups', value: rideGroupsWithRelations.filter((group) => group.status === 'Flagged').length },
  ]), [rideGroupsWithRelations]);

  const alertSummaries = useMemo(() => ([
    { label: 'Critical alerts', value: alertsWithRelations.filter((alert) => alert.severity === 'Critical' && alert.status !== 'Resolved').length },
    { label: 'Warnings', value: alertsWithRelations.filter((alert) => alert.severity === 'Warning' && alert.status !== 'Resolved').length },
    { label: 'Monitoring only', value: alertsWithRelations.filter((alert) => alert.severity === 'Monitoring' && alert.status !== 'Resolved').length },
    { label: 'Resolved today', value: alertsWithRelations.filter((alert) => alert.status === 'Resolved' || alert.resolvedToday).length },
  ]), [alertsWithRelations]);

  const driverExceptionSummary = useMemo(() => {
    const delayedUnits = rideGroupsWithRelations.filter((group) => group.driverContext?.operationalState?.toLowerCase().includes('delayed')).length;
    const stoppedReportingUnits = rideGroupsWithRelations.filter((group) => group.driverContext?.operationalState?.toLowerCase().includes('stopped reporting')).length;
    const awaitingReassignment = alertsWithRelations.filter((alert) => alert.title.toLowerCase().includes('driver reassignment')).length;
    const awaitingDepartureReadiness = rideGroupsWithRelations.filter((group) => !['Departed', 'Ready on dispatch release'].includes(group.departureReadinessDetail?.readinessEstimate) && !['Completed', 'Cancelled', 'En Route'].includes(group.status)).length;
    return {
      delayedUnits,
      stoppedReportingUnits,
      awaitingReassignment,
      awaitingDepartureReadiness,
      relatedAlerts: alertsWithRelations
        .filter((alert) => alert.assignedDriver || alert.title.toLowerCase().includes('driver'))
        .filter((alert) => alert.status !== 'Resolved')
        .sort(byAlertPriority)
        .slice(0, 3),
    };
  }, [alertsWithRelations, rideGroupsWithRelations]);

  const liveMapResolved = useMemo(() => {
    const rideGroupMap = new Map(rideGroupsWithRelations.map((group) => [group.id, group]));
    const alertMap = new Map(alertsWithRelations.map((alert) => [alert.id, alert]));

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
  }, [alertsWithRelations, rideGroupsWithRelations]);

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

  function openRideGroup(id) {
    setSelectedAlertId(null);
    setSelectedRideGroupId(id);
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
    const alert = alertsWithRelations.find((item) => item.id === alertId);
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
          readinessEstimate: 'Ready on dispatch release',
        },
      });
      appendActivity({
        title: `${rideGroupId} closed for joining`,
        description: `Admin closed new rider intake and marked the group ready for dispatch review.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Reopen Group') {
      updateRideGroup(rideGroupId, {
        status: 'Open',
        interventionState: 'Monitoring',
        departureReadinessDetail: {
          ...group.departureReadinessDetail,
          readinessEstimate: 'Awaiting additional riders',
        },
      });
      appendActivity({
        title: `${rideGroupId} reopened for joining`,
        description: `Admin reopened the ride group to absorb additional riders in the current corridor cycle.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Mark Flagged') {
      updateRideGroup(rideGroupId, { status: 'Flagged', interventionState: 'Needs Review' });
      appendActivity({
        title: `${rideGroupId} marked flagged by admin`,
        description: `Operational review was requested for the group due to changing corridor conditions.`,
        meta: `${group.driver ?? 'No driver'} · ${group.zone}`,
      });
    }
    if (action === 'Resolve Flag') {
      updateRideGroup(rideGroupId, { status: 'Filling', interventionState: 'Action Taken' });
      appendActivity({
        title: `${rideGroupId} flag resolved`,
        description: `Admin cleared the active flag after reviewing route and pickup readiness notes.`,
        meta: `${group.pickupPoint} · ${group.zone}`,
      });
    }
    if (action === 'Cancel Group') {
      updateRideGroup(rideGroupId, { status: 'Cancelled', interventionState: 'Action Taken' });
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
    const alert = alertsWithRelations.find((item) => item.id === alertId);
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
    rideGroups: rideGroupsWithRelations,
    rawRideGroups: rideGroups,
    alerts: alertsWithRelations,
    rawAlerts: alerts,
    driverContextMap,
    driverExceptionSummary,
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
    markAlertStatus,
    focusMapOnRideGroup,
    openMapRideGroupDetails,
    openMapAlertDetails,
    openAlertOnMap,
    openRelatedRideGroupFromAlert(alertId) {
      const alert = alertsWithRelations.find((item) => item.id === alertId);
      if (!alert?.relatedGroupId) return;
      openRideGroup(alert.relatedGroupId);
    },
  }), [
    activity,
    alerts,
    alertsWithRelations,
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
    rideGroupSummaries,
    alertSummaries,
    rideGroups,
    rideGroupsWithRelations,
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
