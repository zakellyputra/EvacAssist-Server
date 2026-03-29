import { useState } from 'react';
import { apiFetch } from '../api';

const PRESET_PROMPTS = [
  'Why is this ride high priority?',
  'What should I do next?',
  'Summarize this for shift handoff',
  'What is blocking departure?',
];

export default function AIDispatchAssistantPanel({ rideGroup }) {
  const [question, setQuestion] = useState(PRESET_PROMPTS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runAssistant(nextQuestion = question) {
    setQuestion(nextQuestion);
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/ai/ride-assistant', {
        method: 'POST',
        auth: false,
        body: {
          rideGroupId: rideGroup.id,
          operatorQuestion: nextQuestion,
          rideContext: {
            id: rideGroup.id,
            priorityScore: rideGroup.priorityScore,
            lifecycleStatus: rideGroup.lifecycleStatus,
            actionState: rideGroup.actionState,
            readinessState: rideGroup.readinessState,
            driverAssignment: rideGroup.driverAssignment,
            vehicleId: rideGroup.schemaRefs?.vehicleId ?? null,
            departureReadiness: rideGroup.departureReadiness,
            activeIssues: rideGroup.activeIssues,
            linkedAlerts: rideGroup.linkedAlerts,
            recommendations: rideGroup.recommendations,
            timeline: rideGroup.timeline?.slice(-5),
            auditTrail: rideGroup.auditTrail?.slice(0, 6),
          },
        },
      });
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setError(requestError.message || 'Could not generate recommendations');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="detail-block">
      <div className="exception-summary-header">
        <div>
          <h3>AI Dispatch Assistant</h3>
          <p>Structured operational support for this ride group. AI can summarize and recommend, but it does not change state.</p>
        </div>
      </div>

      <div className="map-detail-actions">
        {PRESET_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className="button button-secondary button-inline" onClick={() => runAssistant(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>

      {loading ? <p className="empty-copy">Generating AI dispatch guidance...</p> : null}
      {error ? <div className="message-block message-block-error">{error || 'AI assistant unavailable'}</div> : null}

      {result ? (
        <div className="note-list">
          <div>
            <strong>Summary</strong>
            {result.summary?.length ? result.summary.map((item) => <p key={item}>{item}</p>) : <p className="empty-copy">No summary available.</p>}
          </div>
          <div>
            <strong>Top Blockers</strong>
            {result.topBlockers?.length ? result.topBlockers.map((item) => <p key={item}>{item}</p>) : <p className="empty-copy">No blockers reported.</p>}
          </div>
          <div>
            <strong>Recommended Next Actions</strong>
            {result.recommendedActions?.length ? result.recommendedActions.map((item) => <p key={item}>{item}</p>) : <p className="empty-copy">No recommended actions returned.</p>}
          </div>
          <div>
            <strong>Handoff Note</strong>
            <p>{result.handoffNote ?? 'No handoff note available.'}</p>
          </div>
        </div>
      ) : null}

      {!result && !error && !loading ? <p className="empty-copy">AI assistant unavailable until you request a ride summary.</p> : null}
    </section>
  );
}

