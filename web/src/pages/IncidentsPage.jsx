import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import LoadingState from '../components/LoadingState';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { mockIncidents } from '../mock/incidents';
import { formatTimestamp } from '../utils/formatters';

function normalizeIncident(incident) {
  const numericSeverity = typeof incident.severity === 'number' ? incident.severity : null;

  return {
    _id: incident._id,
    type: incident.event_type ?? incident.type ?? 'unknown',
    severity: numericSeverity != null
      ? (numericSeverity >= 0.8 ? 'critical' : numericSeverity >= 0.6 ? 'high' : numericSeverity >= 0.35 ? 'medium' : 'low')
      : (incident.severity ?? 'medium'),
    title: incident.title ?? incident.event_type ?? 'Incident',
    isActive: incident.isActive ?? Boolean(incident.expires_at ? new Date(incident.expires_at) > new Date() : true),
    createdAt: incident.created_at ?? incident.createdAt,
  };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formState, setFormState] = useState({ text: '', sourceType: 'user_report' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [parsedResult, setParsedResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIncidents() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await apiFetch('/api/incidents');
        if (cancelled) return;
        setIncidents(data.map(normalizeIncident));
      } catch {
        if (cancelled) return;
        setIncidents(mockIncidents);
        setLoadError('Live incident data was unavailable, so the page is showing mock incident records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIncidents();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({
    active: incidents.filter((incident) => incident.isActive).length,
    resolved: incidents.filter((incident) => !incident.isActive).length,
    critical: incidents.filter((incident) => incident.severity === 'critical').length,
  }), [incidents]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setParsedResult(null);
    setSubmitLoading(true);

    try {
      const result = await apiFetch('/api/incidents/text', {
        method: 'POST',
        body: {
          text: formState.text,
          source_type: formState.sourceType,
        },
      });
      setParsedResult(result.parsed);
      setFormState((current) => ({ ...current, text: '' }));
    } catch (error) {
      setSubmitError(error.message || 'Unable to submit incident report.');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <ErrorBanner message={loadError} />

      <section className="stats-grid stats-grid-three">
        <StatCard label="Active Incidents" value={stats.active} tone="danger" hint="Open field intelligence requiring operator visibility" />
        <StatCard label="Resolved Incidents" value={stats.resolved} tone="muted" hint="Closed or expired events" />
        <StatCard label="Critical Alerts" value={stats.critical} tone="warning" hint="Highest severity items currently visible" />
      </section>

      <section className="dashboard-grid">
        <Panel title="Incident Feed" subtitle="Single monitoring view for active and resolved events">
          {loading ? (
            <LoadingState label="Loading incidents..." />
          ) : (
            <div className="incident-list">
              {incidents.map((incident) => (
                <article key={incident._id} className={`incident-card${incident.isActive ? '' : ' is-resolved'}`}>
                  <div className="incident-card-header">
                    <div>
                      <strong>{incident.title}</strong>
                      <p>{incident.type}</p>
                    </div>
                    <div className="incident-card-meta">
                      <StatusBadge category="incidentSeverity" value={incident.severity} />
                      <StatusBadge category="incidentActivity" value={incident.isActive ? 'active' : 'resolved'} />
                    </div>
                  </div>
                  <span className="incident-card-time">{formatTimestamp(incident.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Submit Incident" subtitle="Preserved incident submission flow inside the consolidated incidents route">
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Source Type</span>
              <select
                value={formState.sourceType}
                onChange={(event) => setFormState((current) => ({ ...current, sourceType: event.target.value }))}
              >
                <option value="user_report">User Report</option>
                <option value="ngo_alert">NGO Alert</option>
                <option value="anonymous">Anonymous Tip</option>
              </select>
            </label>

            <label className="field">
              <span>Report Text</span>
              <textarea
                value={formState.text}
                onChange={(event) => setFormState((current) => ({ ...current, text: event.target.value }))}
                placeholder="Describe the incident, location, and severity."
                required
              />
            </label>

            {submitError ? <ErrorBanner message={submitError} /> : null}

            <button className="button button-primary" disabled={submitLoading}>
              {submitLoading ? 'Parsing report...' : 'Submit Incident'}
            </button>
          </form>

          {parsedResult ? (
            <div className="parsed-block">
              <strong>AI Parsed Result</strong>
              <pre>{JSON.stringify(parsedResult, null, 2)}</pre>
            </div>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}
