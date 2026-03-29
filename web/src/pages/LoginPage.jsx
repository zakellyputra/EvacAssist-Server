import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const MONITORING_AREAS = [
  'Live ride groups moving through pickup corridors',
  'Active drivers checking in across assigned zones',
  'Operational alerts that need intervention',
  'A live evacuation map for route and zone awareness',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, demoCredentials } = useAuth();
  const [formState, setFormState] = useState({
    email: demoCredentials.email,
    password: demoCredentials.password,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(formState.email, formState.password);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to enter the operations dashboard.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-layout">
        <div className="login-briefing">
          <div className="login-briefing-mark">EA</div>
          <div className="login-briefing-copy">
            <p className="kicker">Evacuation Coordination System</p>
            <h1>Admin operations console for live evacuation oversight.</h1>
            <p className="login-summary">
              Monitor ride groups, driver activity, operational constraints, and field alerts
              from a single coordination workspace designed for crisis logistics staff.
            </p>
          </div>

          <div className="monitor-list">
            {MONITORING_AREAS.map((item) => (
              <div key={item} className="monitor-item">
                <span className="monitor-item-mark" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="login-briefing-footnote">
            Phase 1 is using a protected placeholder sign-in so the dashboard flow feels real
            before backend auth is fully wired.
          </div>
        </div>

        <section className="login-card">
          <div className="login-card-header">
            <p className="kicker">Staff Sign-In</p>
            <h2>Access dashboard</h2>
            <p>
              Sign in to review ride group activity, active drivers, route exceptions, and
              critical field alerts.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="message-block message-block-error" role="alert">
                {error}
              </div>
            ) : null}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Enter Dashboard'}
            </button>
          </form>

          <div className="login-helper">
            <strong>Demo credentials</strong>
            <span>{demoCredentials.email}</span>
            <span>{demoCredentials.password}</span>
          </div>
        </section>
      </section>
    </div>
  );
}
