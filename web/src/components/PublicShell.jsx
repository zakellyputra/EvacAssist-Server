import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview' },
  { to: '/zones', label: 'Danger Zones' },
  { to: '/news', label: 'Latest News' },
];

export default function PublicShell() {
  const navigate = useNavigate();
  const { isAuthenticated, role, username, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/overview', { replace: true });
  }

  return (
    <div className="public-shell">
      <header className="public-topbar">
        <Link className="public-brand" to="/overview">
          <span className="public-brand-mark">EA</span>
          <div>
            <strong>EvacAssist</strong>
            <span>Public safety and operator access</span>
          </div>
        </Link>

        <nav className="public-nav" aria-label="Public">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `public-nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="public-actions">
          {isAuthenticated ? (
            <>
              <div className="public-session">
                <strong>{username}</strong>
                <span>{role === 'admin' ? 'Admin workspace unlocked' : 'Operator workspace unlocked'}</span>
              </div>
              <Link className="button button-primary" to="/dashboard">
                Open Workspace
              </Link>
              <button className="button button-secondary" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link className="button button-secondary" to="/login">
                Sign In
              </Link>
              <Link className="button button-primary" to="/register">
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>
    </div>
  );
}
