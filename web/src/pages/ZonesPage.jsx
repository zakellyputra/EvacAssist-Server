import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import DetailPanel from '../components/DetailPanel';
import ErrorBanner from '../components/ErrorBanner';
import LoadingState from '../components/LoadingState';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ZoneDrawer from '../components/ZoneDrawer';
import { mockZones } from '../mock/zones';
import { formatOccupancy } from '../utils/formatters';

function normalizeZone(zone) {
  return {
    _id: zone._id,
    name: zone.name,
    status: zone.status ?? zone.risk_level ?? 'warning',
    capacity: zone.capacity,
    currentOccupancy: zone.currentOccupancy,
    geometry: zone.geometry,
    source: zone.source,
  };
}

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [drawnGeoJSON, setDrawnGeoJSON] = useState(null);
  const [name, setName] = useState('');
  const [riskLevel, setRiskLevel] = useState('high');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/api/zones');
        if (cancelled) return;
        const normalized = data.map(normalizeZone);
        if (normalized.length) {
          setZones(normalized);
        } else {
          setZones(mockZones);
          setError('No live zones were found, so mock fallback zone cards are being displayed.');
        }
      } catch {
        if (cancelled) return;
        setZones(mockZones);
        setError('Live zone data was unavailable, so mock fallback zone cards are being displayed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadZones();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedZone = zones.find((zone) => zone._id === selectedId) ?? zones[0] ?? null;

  const stats = useMemo(() => ({
    safe: zones.filter((zone) => zone.status === 'safe').length,
    atRisk: zones.filter((zone) => ['warning', 'danger', 'blocked'].includes(zone.status)).length,
    occupancyKnown: zones.filter((zone) => typeof zone.currentOccupancy === 'number' && typeof zone.capacity === 'number').length,
  }), [zones]);

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitError('');

    if (!drawnGeoJSON) {
      setSubmitError('Draw a polygon on the map before creating a zone.');
      return;
    }

    try {
      const zone = await apiFetch('/api/zones', {
        method: 'POST',
        body: {
          name,
          geometry: drawnGeoJSON,
          risk_level: riskLevel,
          source: 'operator',
        },
      });

      const normalized = normalizeZone(zone);
      setZones((current) => [normalized, ...current]);
      setSelectedId(normalized._id);
      setName('');
      setDrawnGeoJSON(null);
    } catch (submitErr) {
      setSubmitError(submitErr.message || 'Unable to create the zone.');
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/api/zones/${id}`, { method: 'DELETE' });
      setZones((current) => current.filter((zone) => zone._id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (deleteErr) {
      setSubmitError(deleteErr.message || 'Unable to delete the zone.');
    }
  }

  return (
    <div className="page-stack">
      <ErrorBanner message={error || submitError} />

      <section className="stats-grid stats-grid-three">
        <StatCard label="Safe Zones" value={stats.safe} tone="success" hint="Low-risk areas currently visible" />
        <StatCard label="Zones At Risk" value={stats.atRisk} tone="danger" hint="Warnings, danger zones, or blocked areas" />
        <StatCard label="Occupancy Tracked" value={stats.occupancyKnown} tone="info" hint="Zones with capacity placeholders available" />
      </section>

      <section className="zones-layout">
        <Panel title="Zone Map" subtitle="Preserved drawing surface for zone overlays and operator edits" className="panel-stretch">
          <div className="zone-drawer-shell">
            <ZoneDrawer zones={zones.filter((zone) => zone.geometry)} onDraw={setDrawnGeoJSON} />
          </div>
        </Panel>

        <div className="page-stack">
          <Panel title="Create Zone" subtitle="Wraps the existing zone creation flow in the new shell">
            <form className="form-stack" onSubmit={handleCreate}>
              <label className="field">
                <span>Zone Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sector 4 Conflict" required />
              </label>
              <label className="field">
                <span>Risk Level</span>
                <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <p className="helper-text">
                {drawnGeoJSON ? 'Polygon captured and ready to submit.' : 'Draw a polygon on the map to prepare a zone boundary.'}
              </p>
              <button className="button button-primary">Create Zone</button>
            </form>
          </Panel>

          <Panel title="Zone Inventory" subtitle="Monitor risk state and occupancy placeholders">
            {loading ? (
              <LoadingState label="Loading zones..." />
            ) : (
              <div className="zone-list">
                {zones.map((zone) => (
                  <button
                    type="button"
                    key={zone._id}
                    className={`zone-list-item${selectedZone?._id === zone._id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(zone._id)}
                  >
                    <div>
                      <strong>{zone.name}</strong>
                      <p>{formatOccupancy(zone.currentOccupancy, zone.capacity)}</p>
                    </div>
                    <StatusBadge category="zoneStatus" value={zone.status} />
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <DetailPanel
            title="Zone Detail"
            subtitle="Status, occupancy, and admin action scaffold"
            isEmpty={!selectedZone}
          >
            {selectedZone ? (
              <div className="detail-section-list">
                <div className="detail-section">
                  <span className="detail-label">Zone Name</span>
                  <strong>{selectedZone.name}</strong>
                </div>
                <div className="detail-grid">
                  <div className="detail-section">
                    <span className="detail-label">Status</span>
                    <StatusBadge category="zoneStatus" value={selectedZone.status} />
                  </div>
                  <div className="detail-section">
                    <span className="detail-label">Occupancy</span>
                    <strong>{formatOccupancy(selectedZone.currentOccupancy, selectedZone.capacity)}</strong>
                  </div>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Source</span>
                  <strong>{selectedZone.source ?? 'Operator / Placeholder'}</strong>
                </div>
                <button className="button button-secondary" onClick={() => handleDelete(selectedZone._id)}>
                  Delete Zone
                </button>
              </div>
            ) : null}
          </DetailPanel>
        </div>
      </section>
    </div>
  );
}
