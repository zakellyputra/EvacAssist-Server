import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import ErrorBanner from '../components/ErrorBanner';
import FilterBar from '../components/FilterBar';
import LoadingState from '../components/LoadingState';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import { formatLocationLabel, formatShortId, formatTimestamp } from '../utils/formatters';

function normalizeRequest(request) {
  return {
    _id: String(request?._id ?? ''),
    status: request?.status ?? 'pending',
    priorityLevel: request?.priorityLevel ?? 'medium',
    peopleCount: Number(request?.peopleCount ?? 0),
    pickupLocation: request?.pickupLocation ?? null,
    destinationZoneName: request?.destinationZoneName ?? 'Unassigned zone',
    assignedTripId: request?.assignedTripId ? String(request.assignedTripId) : null,
    assignedDriverUserId: request?.assignedDriverUserId ? String(request.assignedDriverUserId) : null,
    assignedVehicleId: request?.assignedVehicleId ? String(request.assignedVehicleId) : null,
    createdAt: request?.createdAt ?? null,
    updatedAt: request?.updatedAt ?? request?.createdAt ?? null,
  };
}

export default function RequestsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      setLoading(true);
      setError('');

      try {
        const overview = await apiFetch('/api/demo/operations-overview', { auth: false });
        if (cancelled) return;
        const mapped = Array.isArray(overview?.feeds?.requests)
          ? overview.feeds.requests.map(normalizeRequest)
          : [];
        setRequests(mapped);
      } catch (loadError) {
        if (cancelled) return;
        setRequests([]);
        setError(loadError.message || 'Unable to load request records from the database.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const haystack = `${request._id} ${request.status} ${request.priorityLevel} ${request.destinationZoneName} ${formatLocationLabel(request.pickupLocation)}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [requests, search]);

  const selectedRequest = filteredRequests.find((request) => request._id === selectedId) ?? filteredRequests[0] ?? null;

  const columns = [
    { key: '_id', label: 'Request', render: (_, row) => <strong>{formatShortId(row._id)}</strong> },
    { key: 'status', label: 'Status', render: (_, row) => <StatusBadge value={row.status} /> },
    { key: 'priorityLevel', label: 'Priority', render: (_, row) => <StatusBadge value={row.priorityLevel} /> },
    { key: 'peopleCount', label: 'People' },
    { key: 'pickupLocation', label: 'Pickup', render: (_, row) => formatLocationLabel(row.pickupLocation) },
    { key: 'createdAt', label: 'Created', render: (_, row) => formatTimestamp(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <ErrorBanner message={error} />

      <Panel title="Request Queue" subtitle="Live request intake records from MongoDB">
        <FilterBar searchValue={search} onSearchChange={setSearch}>
          <span className="filter-helper">{filteredRequests.length} requests in view</span>
        </FilterBar>
      </Panel>

      <section className="split-layout">
        <Panel title="Requests" subtitle="Select a request to inspect live assignment context">
          {loading ? (
            <LoadingState label="Loading requests..." />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredRequests}
              selectedRowId={selectedRequest?._id}
              onRowClick={(row) => setSelectedId(row._id)}
              emptyTitle="No matching requests"
              emptyMessage="No request records are currently available from the backend."
            />
          )}
        </Panel>

        <DetailPanel
          title="Request Detail"
          subtitle="Assignment-ready summary"
          isEmpty={!selectedRequest}
        >
          {selectedRequest ? (
            <div className="detail-section-list">
              <div className="detail-section">
                <span className="detail-label">Request ID</span>
                <strong>{selectedRequest._id}</strong>
              </div>
              <div className="detail-grid">
                <div className="detail-section">
                  <span className="detail-label">Status</span>
                  <StatusBadge value={selectedRequest.status} />
                </div>
                <div className="detail-section">
                  <span className="detail-label">Priority</span>
                  <StatusBadge value={selectedRequest.priorityLevel} />
                </div>
                <div className="detail-section">
                  <span className="detail-label">People Count</span>
                  <strong>{selectedRequest.peopleCount}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Updated</span>
                  <strong>{formatTimestamp(selectedRequest.updatedAt)}</strong>
                </div>
              </div>
              <div className="detail-section">
                <span className="detail-label">Pickup Location</span>
                <strong>{formatLocationLabel(selectedRequest.pickupLocation)}</strong>
              </div>
              <div className="detail-section">
                <span className="detail-label">Destination Zone</span>
                <strong>{selectedRequest.destinationZoneName}</strong>
              </div>
              <div className="detail-grid">
                <div className="detail-section">
                  <span className="detail-label">Assigned Trip</span>
                  <strong>{selectedRequest.assignedTripId ?? 'Unassigned'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Assigned Driver</span>
                  <strong>{selectedRequest.assignedDriverUserId ?? 'Unassigned'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Assigned Vehicle</span>
                  <strong>{selectedRequest.assignedVehicleId ?? 'Unassigned'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Created</span>
                  <strong>{formatTimestamp(selectedRequest.createdAt)}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </DetailPanel>
      </section>
    </div>
  );
}
