import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2>EvacAssist</h2>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          Dashboard
        </NavLink>
        <NavLink to="/incidents/submit" className={({ isActive }) => isActive ? 'active' : ''}>
          Submit Incident
        </NavLink>
        <NavLink to="/zones" className={({ isActive }) => isActive ? 'active' : ''}>
          Risk Zones
        </NavLink>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
