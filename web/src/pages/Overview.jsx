import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';
import ErrorBanner from '../components/ErrorBanner';
import LiveMap from '../components/LiveMap';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { formatTimestamp } from '../utils/formatters';

function normalizeZone(zone) {
  return {
    _id: zone._id,
    name: zone.name ?? 'Unnamed zone',
    riskLevel: zone.risk_level ?? zone.status ?? 'low',
    source: zone.source ?? 'operator',
    geometry: zone.geometry ?? null,
  };
}

function normalizeIncident(incident) {
  const numericSeverity = typeof incident.severity === 'number' ? incident.severity : null;

  return {
    _id: incident._id,
    title: incident.title ?? incident.event_type ?? 'Incident',
    type: incident.event_type ?? incident.type ?? 'unknown',
    severity: numericSeverity != null
      ? (numericSeverity >= 0.8 ? 'critical' : numericSeverity >= 0.6 ? 'high' : numericSeverity >= 0.35 ? 'medium' : 'low')
      : (incident.severity ?? 'medium'),
    createdAt: incident.created_at ?? incident.createdAt,
    location: incident.location,
  };
}

export default function Overview() {
  const { isAuthenticated } = useAuth();
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError('');

      const [zonesResult, incidentsResult] = await Promise.allSettled([
        apiFetch('/api/zones/public', { auth: false }),
        apiFetch('/api/incidents/public', { auth: false }),
      ]);

      if (cancelled) return;

      if (zonesResult.status === 'fulfilled') {
        setZones(zonesResult.value.map(normalizeZone));
      }

      if (incidentsResult.status === 'fulfilled') {
        setIncidents(incidentsResult.value.map(normalizeIncident));
      }

      if (zonesResult.status === 'rejected' || incidentsResult.status === 'rejected') {
        setError('Some public safety feeds were unavailable, so parts of the overview may be incomplete.');
      }

      setLoading(false);
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  const incidentColumns = [
    { key: 'title', label: 'Alert', render: (_, row) => <strong>{row.title}</strong> },
    { key: 'type', label: 'Type' },
    { key: 'severity', label: 'Severity', render: (_, row) => <StatusBadge category="incidentSeverity" value={row.severity} /> },
    { key: 'createdAt', label: 'Updated', render: (_, row) => formatTimestamp(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Guest Emergency Mode"
        title="Public Overview"
        subtitle="Live map visibility, danger zones, and latest alerts are available without signing in."
        actions={(
          isAuthenticated ? (
            <Link className="button button-primary" to="/dashboard">
              Open Coordination Workspace
            </Link>
          ) : (
            <div className="inline-actions">
              <Link className="button button-secondary" to="/register">
                Create Account
              </Link>
              <Link className="button button-primary" to="/login">
                Sign In for Private Tools
              </Link>
            </div>
          )
        )}
      />

      <ErrorBanner message={error} />

      <section className="stats-grid stats-grid-three">
        <StatCard label="Danger Zones" value={zones.length} tone="danger" hint="Live public hazard overlays" />
        <StatCard label="Latest Alerts" value={incidents.length} tone="warning" hint="Public incident feed from the backend" />
        <StatCard label="Private Tools" value={isAuthenticated ? 'Unlocked' : 'Locked'} tone="info" hint="Driver communication and route planning require sign-in" />
      </section>

      <Panel title="Public Situational Map" subtitle="Read-only map with live incidents and danger-zone overlays">
        {loading ? <LoadingState label="Loading public situational map..." /> : <LiveMap zones={zones} incidents={incidents} />}
      </Panel>

      <section className="dashboard-grid">
        <Panel title="Danger Zone Brief" subtitle="Most recent zones published for guest visibility">
          {loading ? (
            <LoadingState label="Loading danger zones..." />
          ) : zones.length ? (
            <div className="stack-list">
              {zones.slice(0, 6).map((zone) => (
                <div key={zone._id} className="list-row">
                  <div>
                    <strong>{zone.name}</strong>
                    <p>{zone.source} source</p>
                  </div>
                  <div className="list-row-meta">
                    <StatusBadge category="incidentSeverity" value={zone.riskLevel} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LoadingState label="No active public zones published yet." />
          )}
        </Panel>

        <Panel title="Latest Alerts" subtitle="Recent public incident intelligence from the existing backend feed">
          {loading ? (
            <LoadingState label="Loading latest alerts..." />
          ) : (
            <DataTable
              columns={incidentColumns}
              rows={incidents.slice(0, 8)}
              emptyTitle="No public alerts yet"
              emptyMessage="The latest news feed will appear here when incidents are published."
            />
          )}
        </Panel>
      </section>

      <Panel title="Protected Features" subtitle="Why account access still matters">
        <div className="detail-section-list">
          <div className="detail-section">
            <span className="detail-label">Public Access</span>
            <p>Guests can monitor hazards, published danger zones, and the latest alert feed without signing in.</p>
          </div>
          <div className="detail-section">
            <span className="detail-label">Private Access</span>
            <p>Signing in unlocks driver communication, route planning, incident submission, and other coordination-only workflows.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
