import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formState, setFormState] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const successMessage = location.state?.message || '';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formState.username, formState.password);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-copy">
        <PageHeader
          eyebrow="Private Access"
          title="Sign In"
          subtitle="Use your local username and password to coordinate with drivers and unlock private emergency tools."
        />
        <Panel title="Guest Access" subtitle="Public map, danger zones, and latest news stay open to everyone">
          <div className="detail-section-list">
            <div className="detail-section">
              <span className="detail-label">Guests</span>
              <p>Can view the live map, danger zones, and latest alerts without creating an account.</p>
            </div>
            <div className="detail-section">
              <span className="detail-label">Signed-In Users</span>
              <p>Can communicate with drivers, use route planning, submit incidents, and access other protected workflows.</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Account Access" subtitle="Website login now uses privacy-focused local credentials">
        <form className="form-stack" onSubmit={handleSubmit}>
          {successMessage ? (
            <div className="success-banner" role="status">
              <strong>Account created.</strong>
              <span>{successMessage}</span>
            </div>
          ) : null}
          {error ? (
            <div className="error-banner" role="alert">
              <strong>Unable to sign in.</strong>
              <span>{error}</span>
            </div>
          ) : null}

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={formState.username}
              onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="button button-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="helper-text">
            Need an account? <Link to="/register">Create one here</Link>.
          </p>
        </form>
      </Panel>
    </div>
  );
}
