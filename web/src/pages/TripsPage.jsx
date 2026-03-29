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

function normalizeTrip(trip) {
  return {
    _id: String(trip?._id ?? ''),
    status: trip.status ?? 'pending',
    driverUserId: trip.driver_id ?? trip.driverUserId ?? null,
    requestId: trip.requestId ? String(trip.requestId) : null,
    vehicleId: trip.vehicleId ? String(trip.vehicleId) : null,
    pickupLocation: trip.pickupLocation ?? (trip.pickup_loc?.coordinates?.length === 2
      ? { lat: trip.pickup_loc.coordinates[1], lng: trip.pickup_loc.coordinates[0] }
      : null),
    dropoffLocation: trip.dropoffLocation ?? (trip.dropoff_loc?.coordinates?.length === 2
      ? { lat: trip.dropoff_loc.coordinates[1], lng: trip.dropoff_loc.coordinates[0] }
      : null),
    passengers: Number(trip.passengers ?? 0),
    updatedAt: trip.updated_at ?? trip.updatedAt ?? trip.createdAt,
    createdAt: trip.created_at ?? trip.createdAt,
  };
}

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      setLoading(true);
      setError('');
      try {
        const overview = await apiFetch('/api/demo/operations-overview', { auth: false });
        if (cancelled) return;
        const records = Array.isArray(overview?.feeds?.trips) ? overview.feeds.trips : [];
        setTrips(records.map(normalizeTrip));
      } catch (loadError) {
        if (cancelled) return;
        setTrips([]);
        setError(loadError.message || 'Live trip data is currently unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTrips();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const haystack = `${trip._id} ${trip.status} ${trip.driverUserId} ${formatLocationLabel(trip.pickupLocation)}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [search, trips]);

  const selectedTrip = filteredTrips.find((trip) => trip._id === selectedId) ?? filteredTrips[0] ?? null;

  const columns = [
    { key: '_id', label: 'Trip', render: (_, row) => <strong>{formatShortId(row._id)}</strong> },
    { key: 'status', label: 'Status', render: (_, row) => <StatusBadge value={row.status} /> },
    { key: 'driverUserId', label: 'Driver', render: (_, row) => row.driverUserId ?? 'Unassigned' },
    { key: 'pickupLocation', label: 'Pickup', render: (_, row) => formatLocationLabel(row.pickupLocation) },
    { key: 'dropoffLocation', label: 'Dropoff', render: (_, row) => formatLocationLabel(row.dropoffLocation) },
    { key: 'updatedAt', label: 'Updated', render: (_, row) => formatTimestamp(row.updatedAt) },
  ];

  return (
    <div className="page-stack">
      <ErrorBanner message={error} />

      <Panel title="Trip Feed" subtitle="Live trip monitoring from backend records">
        <FilterBar searchValue={search} onSearchChange={setSearch}>
          <span className="filter-helper">{filteredTrips.length} trips in view</span>
        </FilterBar>
      </Panel>

      <section className="split-layout">
        <Panel title="Trips" subtitle="Operational transport queue">
          {loading ? (
            <LoadingState label="Loading trips..." />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredTrips}
              selectedRowId={selectedTrip?._id}
              onRowClick={(row) => setSelectedId(row._id)}
              emptyTitle="No trips available"
              emptyMessage="Trip records will appear here when the backend returns data."
            />
          )}
        </Panel>

        <DetailPanel
          title="Trip Detail"
          subtitle="Status, routing context, and driver metadata scaffold"
          isEmpty={!selectedTrip}
        >
          {selectedTrip ? (
            <div className="detail-section-list">
              <div className="detail-grid">
                <div className="detail-section">
                  <span className="detail-label">Trip ID</span>
                  <strong>{selectedTrip._id}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Status</span>
                  <StatusBadge value={selectedTrip.status} />
                </div>
                <div className="detail-section">
                  <span className="detail-label">Driver</span>
                  <strong>{selectedTrip.driverUserId ?? 'Unassigned'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Updated</span>
                  <strong>{formatTimestamp(selectedTrip.updatedAt)}</strong>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-section">
                  <span className="detail-label">Request ID</span>
                  <strong>{selectedTrip.requestId ?? 'Unavailable'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Vehicle ID</span>
                  <strong>{selectedTrip.vehicleId ?? 'Unassigned'}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Passengers</span>
                  <strong>{selectedTrip.passengers}</strong>
                </div>
                <div className="detail-section">
                  <span className="detail-label">Created</span>
                  <strong>{formatTimestamp(selectedTrip.createdAt)}</strong>
                </div>
              </div>
              <div className="detail-section">
                <span className="detail-label">Pickup</span>
                <strong>{formatLocationLabel(selectedTrip.pickupLocation)}</strong>
              </div>
              <div className="detail-section">
                <span className="detail-label">Dropoff</span>
                <strong>{formatLocationLabel(selectedTrip.dropoffLocation)}</strong>
              </div>
            </div>
          ) : null}
        </DetailPanel>
      </section>
    </div>
  );
}
