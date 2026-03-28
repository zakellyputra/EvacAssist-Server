import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import LoginPage from './pages/LoginPage';
import RequestsPage from './pages/RequestsPage';
import TripsPage from './pages/TripsPage';
import ZonesPage from './pages/ZonesPage';

function PrivateRoute() {
  const { token } = useAuth();
  return token ? <AppShell><Outlet /></AppShell> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

function AppFallback() {
  const { token } = useAuth();
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/zones" element={<ZonesPage />} />
      </Route>
      <Route path="*" element={<AppFallback />} />
    </Routes>
  );
}
