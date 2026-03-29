import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import DetailPanel from '../components/DetailPanel';
import FilterBar from '../components/FilterBar';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import { mockRequests } from '../mock/requests';
import { formatLocationLabel, formatShortId, formatTimestamp } from '../utils/formatters';

export default function RequestsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockRequests[0]?._id ?? null);

  const filteredRequests = useMemo(() => mockRequests.filter((request) => {
    const haystack = `${request._id} ${request.status} ${request.priorityLevel} ${request.pickupLocation?.label ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [search]);

  const selectedRequest = filteredRequests.find((request) => request._id === selectedId) ?? filteredRequests[0] ?? null;

  const columns = [
    { key: '_id', label: 'Request', render: (_, row) => <strong>{formatShortId(row._id)}</strong> },
    { key: 'status', label: 'Status', render: (_, row) => <StatusBadge category="requestStatus" value={row.status} /> },
    { key: 'priorityLevel', label: 'Priority', render: (_, row) => <StatusBadge category="requestPriority" value={row.priorityLevel} /> },
    { key: 'peopleCount', label: 'People' },
    { key: 'pickupLocation', label: 'Pickup', render: (_, row) => formatLocationLabel(row.pickupLocation) },
    { key: 'createdAt', label: 'Created', render: (_, row) => formatTimestamp(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <Panel title="Request Queue" subtitle="Mock-first shell for intake review, prioritization, and operator context">
        <FilterBar searchValue={search} onSearchChange={setSearch}>
          <span className="filter-helper">{filteredRequests.length} requests in view</span>
        </FilterBar>
      </Panel>

      <section className="split-layout">
        <Panel title="Requests" subtitle="Select a request to inspect its current detail shell">
          <DataTable
            columns={columns}
            rows={filteredRequests}
            selectedRowId={selectedRequest?._id}
            onRowClick={(row) => setSelectedId(row._id)}
            emptyTitle="No matching requests"
            emptyMessage="Adjust the search query or add more mock request records."
          />
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
                  <StatusBadge category="requestStatus" value={selectedRequest.status} />
                </div>
                <div className="detail-section">
                  <span className="detail-label">Priority</span>
                  <StatusBadge category="requestPriority" value={selectedRequest.priorityLevel} />
                </div>
                <div className="detail-section">
                  <span className="detail-label">People Count</span>
                  <strong>{selectedRequest.peopleCount}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Created</span>
                  <strong>{formatTimestamp(selectedRequest.createdAt)}</strong>
                </div>
              </div>
              <div className="detail-section">
                <span className="detail-label">Pickup Location</span>
                <strong>{formatLocationLabel(selectedRequest.pickupLocation)}</strong>
              </div>
              <div className="detail-section">
                <span className="detail-label">Next Integration</span>
                <p>Driver assignment actions, request notes, and request lifecycle updates can attach here later without changing the page shell.</p>
              </div>
            </div>
          ) : null}
        </DetailPanel>
      </section>
    </div>
  );
}
