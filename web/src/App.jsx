import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AppShell from './components/AppShell';
import PublicShell from './components/PublicShell';
import DashboardPage from './pages/DashboardPage';
import DriverApprovals from './pages/DriverApprovals';
import IncidentsPage from './pages/IncidentsPage';
import LoginPage from './pages/LoginPage';
import News from './pages/News';
import Overview from './pages/Overview';
import PublicZonesPage from './pages/PublicZonesPage';
import Register from './pages/Register';
import RequestsPage from './pages/RequestsPage';
import TripsPage from './pages/TripsPage';
import ZonesPage from './pages/ZonesPage';

function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell><Outlet /></AppShell> : <Navigate to="/login" replace />;
}

function GuestOnlyRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function AdminRoute() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function AppFallback() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/overview'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/zones" element={<PublicZonesPage />} />
        <Route path="/news" element={<News />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
        </Route>
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/drivers" element={<DriverApprovals />} />
          <Route path="/admin/zones" element={<ZonesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<AppFallback />} />
    </Routes>
  );
}
