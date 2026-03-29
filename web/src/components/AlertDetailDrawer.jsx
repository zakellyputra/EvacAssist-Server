import { useNavigate } from 'react-router-dom';
import ActionStateBadge from './ActionStateBadge';
import DriverContextCard from './DriverContextCard';
import PriorityScoreBadge from './PriorityScoreBadge';
import RelatedEntitiesBlock from './RelatedEntitiesBlock';
import { useOperations } from '../operations';
import StatusBadge from './StatusBadge';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function getSeverityTone(severity) {
  if (severity === 'critical' || severity === 'high') return 'strong';
  if (severity === 'medium') return 'muted';
  return 'default';
}

export default function AlertDetailDrawer({ alert, onClose }) {
  if (!alert) {
    return (
      <aside className="detail-drawer" aria-label="Alert details unavailable">
        <div className="detail-drawer-header">
          <div className="detail-drawer-heading">
            <p className="kicker">Alert Detail</p>
            <h2>Unavailable</h2>
            <p>The selected alert is no longer available in the current exception queue.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    );
  }

  const navigate = useNavigate();
  const { markAlertStatus, openAlertOnMap, openRelatedRideGroupFromAlert } = useOperations();

  function openRelatedGroup() {
    if (!alert.relatedGroupId) return;
    navigate('/ride-groups');
    openRelatedRideGroupFromAlert(alert.id);
  }

  return (
    <aside className="detail-drawer" aria-label={`Alert ${alert.title} details`}>
      <div className="detail-drawer-header">
        <div className="detail-drawer-heading">
          <p className="kicker">Alert Detail</p>
          <h2>{alert.title}</h2>
          <p>{alert.description}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="detail-drawer-body">
        <section className="detail-block">
          <div className="detail-grid">
            <div className="detail-item">
              <span>Severity</span>
              <StatusBadge value={alert.severity} tone={alert.severityTone} />
            </div>
            <div className="detail-item">
              <span>Priority score</span>
              <strong>{alert.priorityScore ?? 0}</strong>
            </div>
            <div className="detail-item">
              <span>Linked ride priority</span>
              {alert.relatedRideGroup ? (
                <PriorityScoreBadge score={alert.relatedRideGroup.priorityScore} />
              ) : (
                <strong>No linked ride group</strong>
              )}
            </div>
            <div className="detail-item">
              <span>Alert code</span>
              <strong>{alert.code ?? alert.id}</strong>
            </div>
            <div className="detail-item">
              <span>Timestamp</span>
              <strong>{formatDate(alert.createdAt)}</strong>
            </div>
            <div className="detail-item">
              <span>Related zone</span>
              <strong>{alert.relatedZone}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span>Action state</span>
              <ActionStateBadge value={alert.status} />
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Description</h3>
          <p className="detail-copy">{alert.detailedDescription}</p>
        </section>

        <RelatedEntitiesBlock
          rideGroupId={alert.relatedGroupId}
          zone={alert.relatedZone}
          assignedDriver={alert.assignedDriver}
          pickupPoint={alert.pickupPoint}
        />
        <DriverContextCard driverContext={alert.driverContext} assignedRideGroupId={alert.relatedGroupId} />

        <section className="detail-block">
          <h3>Suggested Next Action</h3>
          <p className="detail-copy">{alert.suggestedAction}</p>
        </section>

        <section className="detail-block">
          <h3>Recommendations</h3>
          {alert.recommendations?.length ? (
            <div className="linked-list">
              {alert.recommendations.map((recommendation) => (
                <article key={recommendation.id} className="linked-entity">
                  <div>
                    <strong>{recommendation.message}</strong>
                    <span>{recommendation.reason}</span>
                  </div>
                  <div className="linked-entity-meta">
                    <StatusBadge value={recommendation.severity} tone={getSeverityTone(recommendation.severity)} />
                    <span>Confidence {Math.round((recommendation.confidence ?? 0) * 100)}%</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No decision-support recommendations are active for this alert.</p>
          )}
        </section>
      </div>

      <div className="detail-drawer-actions">
        <button type="button" className="button button-secondary" onClick={() => markAlertStatus(alert.id, 'In Review')}>Mark In Review</button>
        <button type="button" className="button button-secondary" onClick={() => markAlertStatus(alert.id, 'Resolved')}>Resolve Alert</button>
        <button type="button" className="button button-secondary" onClick={() => { navigate('/live-map'); openAlertOnMap(alert.id); }}>Open on Live Map</button>
        <button type="button" className="button button-secondary" onClick={openRelatedGroup} disabled={!alert.relatedGroupId}>Open Related Ride Group</button>
        <button type="button" className="button button-secondary" onClick={() => markAlertStatus(alert.id, 'Monitoring')}>Pause Area</button>
        <button type="button" className="button button-primary" onClick={() => markAlertStatus(alert.id, 'Open')}>Escalate</button>
      </div>
    </aside>
  );
}
