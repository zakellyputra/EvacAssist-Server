import { useMemo, useState } from 'react';
import FilterBar from '../components/FilterBar';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import RideGroupsTable from '../components/RideGroupsTable';
import SummaryStrip from '../components/SummaryStrip';
import { useOperations } from '../operations';
import { hasActiveUnresolvedAlerts } from '../utils/priorityDisplay';
import { getConflictSeverityRank } from '../utils/conflictDisplay';

export default function RideGroupsPage() {
  const { rideGroups, rideGroupSummaries, openRideGroup } = useOperations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [zone, setZone] = useState('All');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [noDriverOnly, setNoDriverOnly] = useState(false);
  const [activeAlertsOnly, setActiveAlertsOnly] = useState(false);
  const [activeConflictsOnly, setActiveConflictsOnly] = useState(false);
  const [blockingConflictsOnly, setBlockingConflictsOnly] = useState(false);
  const [criticalConflictsOnly, setCriticalConflictsOnly] = useState(false);
  const [assignmentConflictsOnly, setAssignmentConflictsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Priority');

  const zones = useMemo(() => ['All', ...new Set(rideGroups.map((group) => group.zone))], [rideGroups]);

  const filteredGroups = useMemo(() => {
    const filtered = rideGroups.filter((group) => {
      const matchesSearch = `${group.id} ${group.pickupPoint}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'All' || group.status === status;
      const matchesZone = zone === 'All' || group.zone === zone;
      const matchesFlagged = !flaggedOnly || group.flagged || group.status === 'Flagged' || group.interventionState !== 'None';
      const matchesHighPriority = !highPriorityOnly || (group.priorityScore ?? -1) >= 50;
      const matchesBlocked = !blockedOnly || group.readinessState === 'BLOCKED' || group.actionState === 'BLOCKED';
      const matchesNoDriver = !noDriverOnly || !group.driverAssignment?.assigned;
      const matchesActiveAlerts = !activeAlertsOnly || hasActiveUnresolvedAlerts(group);
      const matchesActiveConflicts = !activeConflictsOnly || group.hasActiveConflicts;
      const matchesBlockingConflicts = !blockingConflictsOnly || group.hasBlockingConflicts;
      const matchesCriticalConflicts = !criticalConflictsOnly || group.highestConflictSeverity === 'critical';
      const matchesAssignmentConflicts = !assignmentConflictsOnly || group.hasAssignmentConflict;
      return matchesSearch
        && matchesStatus
        && matchesZone
        && matchesFlagged
        && matchesHighPriority
        && matchesBlocked
        && matchesNoDriver
        && matchesActiveAlerts
        && matchesActiveConflicts
        && matchesBlockingConflicts
        && matchesCriticalConflicts
        && matchesAssignmentConflicts;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'Capacity') return (b.ridersJoined / b.capacity) - (a.ridersJoined / a.capacity);
      if (sortBy === 'Conflicts') {
        return Number(b.hasBlockingConflicts) - Number(a.hasBlockingConflicts)
          || getConflictSeverityRank(b.highestConflictSeverity) - getConflictSeverityRank(a.highestConflictSeverity)
          || (b.activeConflictCount ?? 0) - (a.activeConflictCount ?? 0)
          || new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (sortBy === 'Priority') {
        return (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
          || Number(b.readinessState === 'BLOCKED') - Number(a.readinessState === 'BLOCKED')
          || new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (sortBy === 'Urgency') {
        const urgencyRank = { 'Needs Review': 3, Monitoring: 2, 'Action Taken': 1, None: 0 };
        return (urgencyRank[b.interventionState] ?? 0) - (urgencyRank[a.interventionState] ?? 0);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [
    activeAlertsOnly,
    activeConflictsOnly,
    assignmentConflictsOnly,
    blockedOnly,
    blockingConflictsOnly,
    criticalConflictsOnly,
    flaggedOnly,
    highPriorityOnly,
    noDriverOnly,
    rideGroups,
    search,
    sortBy,
    status,
    zone,
  ]);

  function handleRideClick(rideGroup) {
    openRideGroup(rideGroup);
  }

  return (
    <div className="dashboard-page">
      <SummaryStrip items={rideGroupSummaries} />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by Group ID or pickup point" />
        <label className="inline-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {['All', 'Open', 'Filling', 'Full', 'En Route', 'Completed', 'Flagged'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Zone</span>
          <select value={zone} onChange={(event) => setZone(event.target.value)}>
            {zones.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={flaggedOnly} onChange={(event) => setFlaggedOnly(event.target.checked)} />
          <span>Flagged only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={highPriorityOnly} onChange={(event) => setHighPriorityOnly(event.target.checked)} />
          <span>High priority only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={blockedOnly} onChange={(event) => setBlockedOnly(event.target.checked)} />
          <span>Blocked only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={noDriverOnly} onChange={(event) => setNoDriverOnly(event.target.checked)} />
          <span>No driver assigned</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={activeAlertsOnly} onChange={(event) => setActiveAlertsOnly(event.target.checked)} />
          <span>Active alerts only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={activeConflictsOnly} onChange={(event) => setActiveConflictsOnly(event.target.checked)} />
          <span>Active conflicts only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={blockingConflictsOnly} onChange={(event) => setBlockingConflictsOnly(event.target.checked)} />
          <span>Blocking conflicts only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={criticalConflictsOnly} onChange={(event) => setCriticalConflictsOnly(event.target.checked)} />
          <span>Critical conflicts only</span>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={assignmentConflictsOnly} onChange={(event) => setAssignmentConflictsOnly(event.target.checked)} />
          <span>Assignment conflicts only</span>
        </label>
        <label className="inline-field">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {['Newest', 'Priority', 'Conflicts', 'Capacity', 'Urgency'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </FilterBar>

      <Panel
        title="Ride Groups"
        subtitle="Monitor active group formations, pickup assignments, and intervention status across current evacuation corridors."
      >
        <RideGroupsTable groups={filteredGroups} onSelectGroup={handleRideClick} showExtendedColumns />
      </Panel>
    </div>
  );
}
