import { useMemo, useState } from 'react';
import FilterBar from '../components/FilterBar';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import RideGroupsTable from '../components/RideGroupsTable';
import SummaryStrip from '../components/SummaryStrip';
import { useOperations } from '../operations';

export default function RideGroupsPage() {
  const { rideGroups, rideGroupSummaries, openRideGroup } = useOperations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [zone, setZone] = useState('All');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');

  const zones = useMemo(() => ['All', ...new Set(rideGroups.map((group) => group.zone))], [rideGroups]);

  const filteredGroups = useMemo(() => {
    const filtered = rideGroups.filter((group) => {
      const matchesSearch = `${group.id} ${group.pickupPoint}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'All' || group.status === status;
      const matchesZone = zone === 'All' || group.zone === zone;
      const matchesFlagged = !flaggedOnly || group.status === 'Flagged' || group.interventionState !== 'None';
      return matchesSearch && matchesStatus && matchesZone && matchesFlagged;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'Capacity') return (b.ridersJoined / b.capacity) - (a.ridersJoined / a.capacity);
      if (sortBy === 'Urgency') {
        const urgencyRank = { 'Needs Review': 3, Monitoring: 2, 'Action Taken': 1, None: 0 };
        return (urgencyRank[b.interventionState] ?? 0) - (urgencyRank[a.interventionState] ?? 0);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [flaggedOnly, rideGroups, search, sortBy, status, zone]);

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
        <label className="inline-field">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {['Newest', 'Capacity', 'Urgency'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </FilterBar>

      <Panel
        title="Ride Groups"
        subtitle="Monitor active group formations, pickup assignments, and intervention status across current evacuation corridors."
      >
        <RideGroupsTable groups={filteredGroups} onSelectGroup={openRideGroup} showExtendedColumns />
      </Panel>
    </div>
  );
}
