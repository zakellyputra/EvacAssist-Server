import { createContext, useContext, useMemo, useState } from 'react';
import { initialActivity, initialAlerts, initialRideGroups, liveMapData, operationsMap } from './mock/operations';

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
  const [activity] = useState(initialActivity);
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

  const selectedRideGroup = useMemo(
    () => rideGroups.find((group) => group.id === selectedRideGroupId) ?? null,
    [rideGroups, selectedRideGroupId],
  );

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId],
  );

  const dashboardStats = useMemo(() => {
    const activeGroups = rideGroups.filter((group) => !['Completed', 'Cancelled'].includes(group.status));
    const openGroups = activeGroups.filter((group) => ['Open', 'Filling'].includes(group.status));
    const flaggedGroups = activeGroups.filter((group) => group.status === 'Flagged' || group.interventionState === 'Needs Review');
    const criticalAlerts = alerts.filter((alert) => alert.status !== 'Resolved' && alert.severity === 'Critical');

    return [
      {
        label: 'Active Ride Groups',
        value: formatCount(activeGroups.length),
        support: `${activeGroups.length} active across 4 pickup corridors with ${rideGroups.filter((group) => group.status === 'En Route').length} already moving.`,
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
  }, [alerts, rideGroups]);

  const dashboardRideGroups = useMemo(
    () => [...rideGroups].filter((group) => group.status !== 'Completed').sort(byNewest).slice(0, 7),
    [rideGroups],
  );

  const dashboardAlerts = useMemo(
    () => [...alerts].filter((alert) => alert.status !== 'Resolved').sort(byAlertPriority).slice(0, 4),
    [alerts],
  );

  const rideGroupSummaries = useMemo(() => ([
    { label: 'Total active groups', value: rideGroups.filter((group) => !['Completed', 'Cancelled'].includes(group.status)).length },
    { label: 'Open groups', value: rideGroups.filter((group) => group.status === 'Open').length },
    { label: 'Full groups', value: rideGroups.filter((group) => group.status === 'Full').length },
    { label: 'Flagged groups', value: rideGroups.filter((group) => group.status === 'Flagged').length },
  ]), [rideGroups]);

  const alertSummaries = useMemo(() => ([
    { label: 'Critical alerts', value: alerts.filter((alert) => alert.severity === 'Critical' && alert.status !== 'Resolved').length },
    { label: 'Warnings', value: alerts.filter((alert) => alert.severity === 'Warning' && alert.status !== 'Resolved').length },
    { label: 'Monitoring only', value: alerts.filter((alert) => alert.severity === 'Monitoring' && alert.status !== 'Resolved').length },
    { label: 'Resolved today', value: alerts.filter((alert) => alert.status === 'Resolved' || alert.resolvedToday).length },
  ]), [alerts]);

  const liveMapResolved = useMemo(() => {
    const rideGroupMap = new Map(rideGroups.map((group) => [group.id, group]));
    const alertMap = new Map(alerts.map((alert) => [alert.id, alert]));

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
  }, [alerts, rideGroups]);

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

  function runRideGroupAction(action, rideGroupId) {
    const group = rideGroups.find((item) => item.id === rideGroupId);
    if (!group) return;

    if (action === 'Close Joining') updateRideGroup(rideGroupId, { status: 'Full', interventionState: 'Monitoring' });
    if (action === 'Reopen Group') updateRideGroup(rideGroupId, { status: 'Open', interventionState: 'Monitoring' });
    if (action === 'Mark Flagged') updateRideGroup(rideGroupId, { status: 'Flagged', interventionState: 'Needs Review' });
    if (action === 'Resolve Flag') updateRideGroup(rideGroupId, { status: 'Filling', interventionState: 'Action Taken' });
    if (action === 'Cancel Group') updateRideGroup(rideGroupId, { status: 'Cancelled', interventionState: 'Action Taken' });
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
    updateAlert(alertId, { status, resolvedToday: status === 'Resolved' ? true : undefined });
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
    rideGroups,
    alerts,
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
    openMapRideGroupDetails,
    openMapAlertDetails,
    openRelatedRideGroupFromAlert(alertId) {
      const alert = alerts.find((item) => item.id === alertId);
      if (!alert?.relatedGroupId) return;
      openRideGroup(alert.relatedGroupId);
    },
  }), [
    activity,
    alerts,
    confirmation,
    dashboardAlerts,
    dashboardRideGroups,
    dashboardStats,
    filteredLiveMapData,
    liveMapResolved,
    liveMapSummaries,
    mapFilters,
    rideGroupSummaries,
    alertSummaries,
    rideGroups,
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
