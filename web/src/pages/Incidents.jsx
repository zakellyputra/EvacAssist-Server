import { useState } from 'react';
import { apiFetch } from '../api';

const SOURCE_TYPES = [
  { value: 'user_report', label: 'User Report' },
  { value: 'ngo_alert', label: 'NGO Alert' },
  { value: 'anonymous', label: 'Anonymous Tip' },
];

export default function Incidents() {
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('user_report');
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setParsed(null);
    setLoading(true);
    try {
      const result = await apiFetch('/api/incidents/text', {
        method: 'POST',
        body: { text, source_type: sourceType },
      });
      setParsed(result.parsed);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Submit Incident Report</h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Source Type</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Report Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the incident: location, what happened, severity..."
              required
            />
          </div>

          {error && <div className="error" style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>{error}</div>}

          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Parsing with AI...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {parsed && (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginBottom: '0.5rem' }}>AI Parsed Result</h3>
          <div className="parsed-result">{JSON.stringify(parsed, null, 2)}</div>
        </div>
      )}
    </>
  );
}
