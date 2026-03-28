import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import DataTable from '../components/DataTable';
import ErrorBanner from '../components/ErrorBanner';
import LoadingState from '../components/LoadingState';
import Panel from '../components/Panel';
import { formatTimestamp } from '../utils/formatters';

export default function DriverApprovals() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      setLoading(true);
      setError('');

      try {
        const data = await apiFetch('/api/users/pending-drivers');
        if (!cancelled) setDrivers(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Failed to load pending drivers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDrivers();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAction(id, action) {
    try {
      await apiFetch(`/api/users/${id}/${action}`, { method: 'PATCH' });
      setDrivers((prev) => prev.filter((driver) => driver._id !== id));
    } catch (actionError) {
      setError(actionError.message || 'Unable to update driver approval');
    }
  }

  const columns = [
    { key: 'name', label: 'Driver', render: (_, row) => <strong>{row.name}</strong> },
    { key: 'username', label: 'Username', render: (_, row) => `@${row.username}` },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (_, row) => row.vehicle?.make
        ? `${row.vehicle.make}${row.vehicle?.model ? ` ${row.vehicle.model}` : ''}`
        : 'Vehicle TBD',
    },
    { key: 'created_at', label: 'Registered', render: (_, row) => formatTimestamp(row.created_at) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="inline-actions">
          <button className="button button-secondary" onClick={() => handleAction(row._id, 'reject')}>
            Reject
          </button>
          <button className="button button-primary" onClick={() => handleAction(row._id, 'approve')}>
            Approve
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <ErrorBanner message={error} />

      <Panel title="Pending Drivers" subtitle="Approve or reject self-registered drivers before they can sign in">
        {loading ? (
          <LoadingState label="Loading pending drivers..." />
        ) : (
          <DataTable
            columns={columns}
            rows={drivers}
            emptyTitle="No pending drivers"
            emptyMessage="New driver registrations will appear here for admin review."
          />
        )}
      </Panel>
    </div>
  );
}
