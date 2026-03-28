import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import ErrorBanner from '../components/ErrorBanner';
import LiveMap from '../components/LiveMap';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

function normalizeZone(zone) {
  return {
    _id: zone._id,
    name: zone.name ?? 'Unnamed zone',
    riskLevel: zone.risk_level ?? zone.status ?? 'low',
    source: zone.source ?? 'operator',
    geometry: zone.geometry ?? null,
  };
}

export default function PublicZonesPage() {
  const { isAuthenticated, role } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      setLoading(true);
      setError('');

      try {
        const data = await apiFetch('/api/zones/public', { auth: false });
        if (!cancelled) setZones(data.map(normalizeZone));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load public danger zones.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadZones();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({
    total: zones.length,
    severe: zones.filter((zone) => ['high', 'critical', 'danger', 'blocked'].includes(zone.riskLevel)).length,
    mapped: zones.filter((zone) => zone.geometry).length,
  }), [zones]);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Public Safety View"
        title="Danger Zones"
        subtitle="Guests can review live hazard overlays, while zone creation and deletion stay in the protected admin workspace."
        actions={(
          role === 'admin' ? (
            <Link className="button button-primary" to="/admin/zones">
              Manage Zones
            </Link>
          ) : isAuthenticated ? (
            <span className="helper-text">Zone editing is limited to admins.</span>
          ) : (
            <Link className="button button-secondary" to="/login">
              Sign In for Private Tools
            </Link>
          )
        )}
      />

      <ErrorBanner message={error} />

      <section className="stats-grid stats-grid-three">
        <StatCard label="Published Zones" value={stats.total} tone="accent" hint="Live public danger-zone overlays" />
        <StatCard label="High Severity" value={stats.severe} tone="danger" hint="Zones flagged as high, critical, blocked, or danger" />
        <StatCard label="Mapped Overlays" value={stats.mapped} tone="info" hint="Zones with geometry ready for the public map" />
      </section>

      <section className="dashboard-grid">
        <Panel title="Public Zone Map" subtitle="Read-only live map for guests and responders">
          {loading ? <LoadingState label="Loading public zone map..." /> : <LiveMap zones={zones} incidents={[]} />}
        </Panel>

        <Panel title="Published Zone List" subtitle="Latest zone overlays from the backend public feed">
          {loading ? (
            <LoadingState label="Loading public zones..." />
          ) : zones.length ? (
            <div className="stack-list">
              {zones.map((zone) => (
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
            <LoadingState label="No public zones are published yet." />
          )}
        </Panel>
      </section>

      <Panel title="Access Policy" subtitle="What guests can see versus what stays private">
        <div className="detail-section-list">
          <div className="detail-section">
            <span className="detail-label">Guest Access</span>
            <p>View the live map, current danger zones, and latest public alerts without an account.</p>
          </div>
          <div className="detail-section">
            <span className="detail-label">Protected Features</span>
            <p>Zone editing, driver coordination, route planning, and other private actions stay behind username and password sign-in.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
