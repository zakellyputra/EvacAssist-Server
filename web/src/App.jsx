import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { useAuth } from './auth';
import AlertsPage from './pages/AlertsPage';
import DashboardPage from './pages/DashboardPage';
import LiveMapPage from './pages/LiveMapPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import RideGroupsPage from './pages/RideGroupsPage';
import RequestEvacuation from './pages/RequestEvacuation';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/request" element={<RequestEvacuation />} />
      <Route
        path="/login"
        element={(
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        )}
      />
      <Route
        element={(
          <ProtectedRoute>
            <AppShell>
              <Outlet />
            </AppShell>
          </ProtectedRoute>
        )}
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ride-groups" element={<RideGroupsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/live-map" element={<LiveMapPage />} />
        <Route
          path="/settings"
          element={<PlaceholderPage title="Settings" description="Console settings, alert rules, and workflow defaults will be managed from this area in a later phase." />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
