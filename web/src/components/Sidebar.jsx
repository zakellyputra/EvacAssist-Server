import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', description: 'Operational overview' },
  { to: '/ride-groups', label: 'Ride Groups', description: 'Grouping and assignment queue' },
  { to: '/live-map', label: 'Live Map', description: 'Tracked units and route watch' },
  { to: '/alerts', label: 'Alerts', description: 'Exceptions requiring action' },
  { to: '/drivers', label: 'Drivers', description: 'Field unit status' },
  { to: '/settings', label: 'Settings', description: 'Console configuration' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">EA</div>
        <div>
          <strong>EvacAssist</strong>
          <p>Admin operations dashboard</p>
        </div>
      </div>

      <div className="sidebar-section-label">Workspace</div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map((item, index) => (
          <NavLink
            key={`${item.label}-${index}`}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
          >
            <span>{item.label}</span>
            <small>{item.description}</small>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-note">
          <strong>Phase 2 Workflow</strong>
          <p>
            Ride groups, alerts, and drill-down detail drawers now share one local operational
            state model so the board behaves like a connected monitoring system.
          </p>
        </div>
      </div>
    </aside>
  );
}
