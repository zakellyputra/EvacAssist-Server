import { useMemo, useState } from 'react';
import AlertsList from '../components/AlertsList';
import FilterBar from '../components/FilterBar';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import SummaryStrip from '../components/SummaryStrip';
import { useOperations } from '../operations';

export default function AlertsPage() {
  const { alerts, alertSummaries, openAlert } = useOperations();
  const [severity, setSeverity] = useState('All');
  const [zone, setZone] = useState('All');
  const [group, setGroup] = useState('All');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [sortBy, setSortBy] = useState('Highest Severity');
  const [search, setSearch] = useState('');

  const zones = useMemo(() => ['All', ...new Set(alerts.map((alert) => alert.relatedZone))], [alerts]);
  const groups = useMemo(() => ['All', ...new Set(alerts.map((alert) => alert.relatedGroupId).filter(Boolean))], [alerts]);

  const filteredAlerts = useMemo(() => {
    const severityRank = { Critical: 3, Warning: 2, Monitoring: 1 };
    return alerts
      .filter((alert) => {
        const matchesSearch = `${alert.title} ${alert.description}`.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severity === 'All' || alert.severity === severity;
        const matchesZone = zone === 'All' || alert.relatedZone === zone;
        const matchesGroup = group === 'All' || alert.relatedGroupId === group;
        const matchesResolved = !unresolvedOnly || alert.status !== 'Resolved';
        return matchesSearch && matchesSeverity && matchesZone && matchesGroup && matchesResolved;
      })
      .sort((a, b) => {
        if (sortBy === 'Newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      });
  }, [alerts, group, search, severity, sortBy, unresolvedOnly, zone]);

  return (
    <div className="dashboard-page">
      <SummaryStrip items={alertSummaries} />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search alerts or exceptions" />
        <label className="inline-field">
          <span>Severity</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            {['All', 'Critical', 'Warning', 'Monitoring'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Related zone</span>
          <select value={zone} onChange={(event) => setZone(event.target.value)}>
            {zones.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Ride group</span>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            {groups.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-checkbox">
          <input type="checkbox" checked={unresolvedOnly} onChange={(event) => setUnresolvedOnly(event.target.checked)} />
          <span>Unresolved only</span>
        </label>
        <label className="inline-field">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {['Highest Severity', 'Newest'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </FilterBar>

      <Panel
        title="Alerts & Exceptions"
        subtitle="Review operational issues that require monitoring, manual intervention, or route-level attention."
      >
        <AlertsList alerts={filteredAlerts} onSelectAlert={openAlert} compact={false} embedded />
      </Panel>
    </div>
  );
}
