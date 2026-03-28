import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import LoadingState from '../components/LoadingState';
import MapPlaceholder from '../components/MapPlaceholder';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { mockRequests } from '../mock/requests';
import { formatLocationLabel, formatShortId, formatTimestamp } from '../utils/formatters';

function normalizeTrip(trip) {
  return {
    _id: trip._id,
    status: trip.status,
    pickupLocation: trip.pickup_loc
      ? { coordinates: trip.pickup_loc.coordinates }
      : trip.pickupLocation,
    updatedAt: trip.updated_at ?? trip.updatedAt,
  };
}

function normalizeIncident(incident) {
  const severity = typeof incident.severity === 'number'
    ? (incident.severity >= 0.8 ? 'critical' : incident.severity >= 0.6 ? 'high' : incident.severity >= 0.35 ? 'medium' : 'low')
    : incident.severity;

  return {
    _id: incident._id,
    type: incident.event_type ?? incident.type ?? 'unknown',
    severity: severity ?? 'medium',
    title: incident.title ?? incident.event_type ?? 'Incident',
    isActive: incident.isActive ?? Boolean(incident.expires_at ? new Date(incident.expires_at) > new Date() : true),
    createdAt: incident.created_at ?? incident.createdAt,
  };
}

function normalizeZone(zone) {
  return {
    _id: zone._id,
    name: zone.name,
    status: zone.status ?? zone.risk_level ?? 'warning',
    capacity: zone.capacity,
    currentOccupancy: zone.currentOccupancy,
  };
}

export default function DashboardPage() {
  const [trips, setTrips] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      const [tripsResult, incidentsResult, zonesResult] = await Promise.allSettled([
        apiFetch('/api/trips/my'),
        apiFetch('/api/incidents'),
        apiFetch('/api/zones'),
      ]);

      if (cancelled) return;

      if (tripsResult.status === 'fulfilled') {
        setTrips(tripsResult.value.map(normalizeTrip));
      }
      if (incidentsResult.status === 'fulfilled') {
        setIncidents(incidentsResult.value.map(normalizeIncident));
      }
      if (zonesResult.status === 'fulfilled') {
        setZones(zonesResult.value.map(normalizeZone));
      }

      const failures = [tripsResult, incidentsResult, zonesResult].filter((result) => result.status === 'rejected');
      if (failures.length) {
        setError('Some backend resources were unavailable, so the dashboard is showing partial data.');
      }

      setLoading(false);
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({
    activeRequests: mockRequests.filter((request) => !['completed', 'cancelled', 'failed'].includes(request.status)).length,
    activeTrips: trips.filter((trip) => ['accepted', 'in_progress'].includes(trip.status)).length,
    activeIncidents: incidents.filter((incident) => incident.isActive).length,
    zonesAtRisk: zones.filter((zone) => ['warning', 'danger', 'blocked'].includes(zone.status)).length,
  }), [trips, incidents, zones]);

  return (
    <div className="page-stack">
      <ErrorBanner message={error} />

      <section className="stats-grid">
        <StatCard label="Active Requests" value={stats.activeRequests} tone="warning" hint="Mock-first request queue" />
        <StatCard label="Active Trips" value={stats.activeTrips} tone="info" hint="Live trips where available" />
        <StatCard label="Active Incidents" value={stats.activeIncidents} tone="danger" hint="Structured field intelligence" />
        <StatCard label="Zones At Risk" value={stats.zonesAtRisk} tone="accent" hint="Warnings, danger, or blocked zones" />
      </section>

      <section className="dashboard-grid">
        <Panel title="Recent Requests" subtitle="Latest queue activity from mock-ready request data">
          {loading ? (
            <LoadingState label="Loading request summary..." />
          ) : (
            <div className="stack-list">
              {mockRequests.slice(0, 4).map((request) => (
                <div key={request._id} className="list-row">
                  <div>
                    <strong>{formatShortId(request._id)}</strong>
                    <p>{formatLocationLabel(request.pickupLocation)}</p>
                  </div>
                  <div className="list-row-meta">
                    <StatusBadge category="requestStatus" value={request.status} />
                    <span className="list-row-time">{formatTimestamp(request.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Incidents" subtitle="Live incident feed from the existing backend">
          {loading ? (
            <LoadingState label="Loading incident feed..." />
          ) : incidents.length ? (
            <div className="stack-list">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident._id} className={`list-row ${incident.isActive ? '' : 'is-muted'}`}>
                  <div>
                    <strong>{incident.title}</strong>
                    <p>{incident.type}</p>
                  </div>
                  <div className="list-row-meta">
                    <StatusBadge category="incidentSeverity" value={incident.severity} />
                    <span className="list-row-time">{formatTimestamp(incident.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LoadingState label="No incidents returned from the backend yet." />
          )}
        </Panel>
      </section>

      <Panel title="Map Surface" subtitle="Reserved space for live map overlays, route context, and zone visibility">
        <MapPlaceholder message="Use this panel as the shared dashboard map surface while teammates wire route, edge, and live layer data." />
      </Panel>
    </div>
  );
}
