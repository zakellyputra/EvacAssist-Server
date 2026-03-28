import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import PageHeader from './PageHeader';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', description: 'Operational overview and live summary' },
  { to: '/requests', label: 'Requests', description: 'Evacuation queue and assignment triage' },
  { to: '/trips', label: 'Trips', description: 'Driver movement and transport monitoring' },
  { to: '/incidents', label: 'Incidents', description: 'Hazard intake and active event monitoring' },
  { to: '/zones', label: 'Zones', description: 'Risk zones, map overlays, and capacity view' },
];

const PAGE_META = {
  '/dashboard': {
    title: 'Operations Dashboard',
    subtitle: 'Track active demand, live incidents, and zone pressure across the network.',
  },
  '/requests': {
    title: 'Request Queue',
    subtitle: 'Review incoming evacuation demand and inspect request details before assignment.',
  },
  '/trips': {
    title: 'Trip Monitoring',
    subtitle: 'Monitor transport progress, driver activity, and operational status changes.',
  },
  '/incidents': {
    title: 'Incident Monitoring',
    subtitle: 'Review live hazards and submit new incident intelligence from the field.',
  },
  '/zones': {
    title: 'Zone Management',
    subtitle: 'Monitor risk zones and keep map overlays aligned with current field conditions.',
  },
};

function getPageMeta(pathname) {
  return PAGE_META[pathname] ?? PAGE_META['/dashboard'];
}

export default function AppShell({ children }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <span className="shell-brand-mark">EA</span>
          <div>
            <h1>EvacAssist</h1>
            <p>Coordinator Console</p>
          </div>
        </div>

        <nav className="shell-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `shell-nav-link${isActive ? ' is-active' : ''}`}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </NavLink>
          ))}
        </nav>

        <div className="shell-sidebar-footer">
          <div className="session-card">
            <strong>Session active</strong>
            <span>Authenticated operator workspace</span>
          </div>
          <button className="button button-secondary" onClick={logout}>
            Log Out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <PageHeader title={meta.title} subtitle={meta.subtitle} />
          <div className="shell-topbar-meta">
            <span className="eyebrow">Admin Shell</span>
            <span className="topbar-helper">Frontend shell using existing auth and API contracts</span>
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
