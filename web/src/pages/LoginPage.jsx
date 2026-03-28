import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formState.email);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-shell-panel">
        <div className="login-copy">
          <p className="eyebrow">EvacAssist</p>
          <h1>Coordinator dashboard access</h1>
          <p>
            Frontend shell for the operational admin workspace. This login screen keeps the current auth integration intact while presenting a cleaner admin entry point.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="text"
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              placeholder="operator@evacassist.org"
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
              required
            />
          </label>

          {error ? <div className="error-banner" role="alert"><span>{error}</span></div> : null}

          <button className="button button-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="helper-text">Current backend auth is preserved. This shell only restyles the operator entry flow.</p>
        </form>
      </div>
    </div>
  );
}
