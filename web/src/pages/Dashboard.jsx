import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { getSocket } from '../socket';
import LiveMap from '../components/LiveMap';
import TripTable from '../components/TripTable';
import IncidentTable from '../components/IncidentTable';

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    apiFetch('/api/trips/my').then(setTrips).catch(console.error);
    apiFetch('/api/incidents').then(setIncidents).catch(console.error);
    apiFetch('/api/zones').then(setZones).catch(console.error);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlers = {
      new_request: (data) =>
        setTrips((prev) => [{ _id: data.trip_id, status: 'pending', ...data }, ...prev]),
      trip_accepted: (data) =>
        setTrips((prev) =>
          prev.map((t) => (t._id === data.trip_id ? { ...t, status: 'accepted' } : t)),
        ),
      trip_verified: (data) =>
        setTrips((prev) =>
          prev.map((t) => (t._id === data.trip_id ? { ...t, status: 'in_progress' } : t)),
        ),
      trip_completed: (data) =>
        setTrips((prev) =>
          prev.map((t) => (t._id === data.trip_id ? { ...t, status: 'completed' } : t)),
        ),
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
    };
  }, []);

  const stats = {
    pending: trips.filter((t) => t.status === 'pending').length,
    active: trips.filter((t) => ['accepted', 'in_progress'].includes(t.status)).length,
    completed: trips.filter((t) => t.status === 'completed').length,
    incidents: incidents.length,
  };

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Dashboard</h1>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="value">{stats.pending}</div>
          <div className="label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.active}</div>
          <div className="label">Active</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.completed}</div>
          <div className="label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.incidents}</div>
          <div className="label">Incidents</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>Live Map</h3>
        <LiveMap zones={zones} incidents={incidents} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Recent Trips</h3>
          <TripTable trips={trips.slice(0, 20)} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Active Incidents</h3>
          <IncidentTable incidents={incidents.slice(0, 20)} />
        </div>
      </div>
    </>
  );
}
