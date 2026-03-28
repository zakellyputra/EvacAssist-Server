import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';

const DEFAULT_VEHICLE = { make: '', model: '', seats: '' };

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'rider',
    wallet_address: '',
  });
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        vehicle: form.role === 'driver'
          ? {
              make: vehicle.make,
              model: vehicle.model,
              seats: vehicle.seats ? Number(vehicle.seats) : undefined,
            }
          : undefined,
      };

      const result = await register(payload);
      if (result.access_token) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setSuccess(
        result.message
          || (form.role === 'driver'
            ? 'Driver account created. Wait for admin approval before signing in.'
            : 'Account created successfully.'),
      );
    } catch (submitError) {
      setError(submitError.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-copy">
        <PageHeader
          eyebrow="Create Access"
          title="Create Account"
          subtitle="Registration stays local to your EvacAssist deployment. Drivers can self-register, then wait for admin approval."
        />
        <Panel title="How Access Works" subtitle="Guest browsing stays public while private coordination stays protected">
          <div className="detail-section-list">
            <div className="detail-section">
              <span className="detail-label">Private Users</span>
              <p>Rider and staff accounts can sign in immediately after registration and use protected website tools.</p>
            </div>
            <div className="detail-section">
              <span className="detail-label">Drivers</span>
              <p>Driver accounts stay pending until an admin approves them, which keeps the coordination network private and controlled.</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Registration" subtitle="Use a username and password instead of phone-based identity">
        <form className="form-stack" onSubmit={handleSubmit}>
          {error ? (
            <div className="error-banner" role="alert">
              <strong>Unable to create account.</strong>
              <span>{error}</span>
            </div>
          ) : null}
          {success ? (
            <div className="success-banner" role="status">
              <strong>Account created.</strong>
              <span>{success}</span>
            </div>
          ) : null}

          <label className="field">
            <span>Full Name</span>
            <input
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              placeholder="Choose a username"
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="field">
            <span>Account Type</span>
            <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              <option value="rider">Private user</option>
              <option value="driver">Driver</option>
            </select>
          </label>

          {form.role === 'driver' ? (
            <>
              <div className="detail-grid">
                <label className="field">
                  <span>Vehicle Make</span>
                  <input
                    type="text"
                    placeholder="Vehicle make"
                    value={vehicle.make}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, make: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Vehicle Model</span>
                  <input
                    type="text"
                    placeholder="Vehicle model"
                    value={vehicle.model}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </label>
              </div>

              <label className="field">
                <span>Available Seats</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Available seats"
                  value={vehicle.seats}
                  onChange={(event) => setVehicle((prev) => ({ ...prev, seats: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>Wallet Address</span>
                <input
                  type="text"
                  placeholder="Optional wallet address"
                  value={form.wallet_address}
                  onChange={(event) => updateField('wallet_address', event.target.value)}
                />
              </label>
            </>
          ) : null}

          <button className="button button-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="helper-text">
            Already have an account? <Link to="/login">Sign in</Link>.
          </p>
        </form>
      </Panel>
    </div>
  );
}
