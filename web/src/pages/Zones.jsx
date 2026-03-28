import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import ZoneDrawer from '../components/ZoneDrawer';

const RISK_LEVELS = ['low', 'moderate', 'high', 'critical'];

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [name, setName] = useState('');
  const [riskLevel, setRiskLevel] = useState('high');
  const [drawnGeoJSON, setDrawnGeoJSON] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    try {
      const data = await apiFetch('/api/zones');
      setZones(data);
    } catch (err) {
      console.error('Failed to load zones:', err);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!drawnGeoJSON) {
      setError('Draw a polygon on the map first');
      return;
    }
    try {
      await apiFetch('/api/zones', {
        method: 'POST',
        body: {
          name,
          geometry: drawnGeoJSON,
          risk_level: riskLevel,
          source: 'operator',
        },
      });
      setName('');
      setDrawnGeoJSON(null);
      loadZones();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/api/zones/${id}`, { method: 'DELETE' });
      setZones((prev) => prev.filter((z) => z._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Risk Zones</h1>

      <div className="zone-layout">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ZoneDrawer zones={zones} onDraw={setDrawnGeoJSON} />
        </div>

        <div className="zone-sidebar">
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Create Zone</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Sector 4 Conflict" />
              </div>
              <div className="form-group">
                <label>Risk Level</label>
                <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              {drawnGeoJSON && (
                <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                  Polygon drawn ({drawnGeoJSON.coordinates[0].length - 1} points)
                </p>
              )}
              {error && <div className="error" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>{error}</div>}
              <button className="btn btn-primary" style={{ width: '100%' }}>Create Zone</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Existing Zones ({zones.length})</h3>
            {zones.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No zones yet</p>}
            {zones.map((z) => (
              <div key={z._id} className="zone-item">
                <div>
                  <div>{z.name}</div>
                  <span className={`badge badge-${z.risk_level}`}>{z.risk_level}</span>
                </div>
                <button onClick={() => handleDelete(z._id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
