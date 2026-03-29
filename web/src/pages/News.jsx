import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import DataTable from '../components/DataTable';
import ErrorBanner from '../components/ErrorBanner';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import { formatTimestamp } from '../utils/formatters';

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
  };
}

export default function News() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      setError('');

      try {
        const data = await apiFetch('/api/incidents/public', { auth: false });
        if (!cancelled) setIncidents(data.map(normalizeIncident));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load the public alerts feed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNews();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { key: 'title', label: 'Alert', render: (_, row) => <strong>{row.title}</strong> },
    { key: 'type', label: 'Type' },
    { key: 'severity', label: 'Severity', render: (_, row) => <StatusBadge category="incidentSeverity" value={row.severity} /> },
    { key: 'createdAt', label: 'Published', render: (_, row) => formatTimestamp(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Public Alerts Feed"
        title="Latest News"
        subtitle="The website reuses live incident data as the public alerts and latest-news feed."
      />

      <ErrorBanner message={error} />

      <Panel title="Recent Alerts and Incidents" subtitle="Live public incident feed for guests and responders">
        {loading ? (
          <LoadingState label="Loading latest public alerts..." />
        ) : (
          <DataTable
            columns={columns}
            rows={incidents}
            emptyTitle="No published alerts"
            emptyMessage="Public incident updates will appear here when the backend publishes them."
          />
        )}
      </Panel>
    </div>
  );
}
