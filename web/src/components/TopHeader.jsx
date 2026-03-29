import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const PAGE_META = {
  '/dashboard': {
    kicker: 'Dashboard',
    title: 'Evacuation Operations Dashboard',
    description: 'Live overview of ride group readiness, unit coverage, pickup pressure, and route-level exceptions across the active evacuation network.',
  },
  '/ride-groups': {
    kicker: 'Ride Groups',
    title: 'Ride Group Monitoring',
    description: 'Monitor active group formations, pickup assignments, and intervention status across current evacuation corridors.',
  },
  '/alerts': {
    kicker: 'Alerts & Exceptions',
    title: 'Operational Alert Queue',
    description: 'Review issues that require monitoring, manual intervention, or route-level attention before they impact departures.',
  },
  '/live-map': {
    kicker: 'Live Map',
    title: 'Live Spatial Operations Map',
    description: 'Monitor active ride groups, pickup points, driver movement, and restricted corridors across the current response area.',
  },
  '/settings': {
    kicker: 'Settings',
    title: 'Console Settings',
    description: 'Workflow defaults, alert rules, and admin preferences will be managed here.',
  },
};

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function TopHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const meta = PAGE_META[location.pathname] ?? PAGE_META['/dashboard'];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="top-header">
      <div className="top-header-copy">
        <p className="kicker">{meta.kicker}</p>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        <div className="top-header-updated">
          <span className="top-header-updated-label">Last updated</span>
          <strong>{formatTime(now)}</strong>
        </div>
      </div>

      <div className="top-header-meta">
        <div className="profile-card">
          <div className="profile-card-copy">
            <span>{user?.role ?? 'Coordinator'}</span>
            <strong>{user?.name ?? 'Admin User'}</strong>
            <p>Dispatch board synchronized with the current live operations snapshot.</p>
          </div>
          <button type="button" className="button button-secondary button-inline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
