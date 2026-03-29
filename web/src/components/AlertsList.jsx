import Panel from './Panel';
import PriorityScoreBadge from './PriorityScoreBadge';
import StatusBadge from './StatusBadge';

export default function AlertsList({ alerts, onSelectAlert, compact = true, embedded = false, actions = null }) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const content = (
    <div className={`alerts-list${compact ? ' alerts-list-compact' : ''}`}>
      {safeAlerts.map((alert) => (
        <article
          key={alert.id}
          className={`alert-card${onSelectAlert ? ' is-interactive' : ''}`}
          onClick={onSelectAlert ? () => onSelectAlert(alert.id) : undefined}
        >
          <div className="alert-card-header">
            <StatusBadge value={alert.severity} tone={alert.severityTone} />
            <span className="alert-zone">{alert.relatedGroupId ?? alert.relatedZone}</span>
          </div>
          <div className="alert-card-copy">
            <strong>{alert.title}</strong>
            <p>{alert.description}</p>
            <div className="alert-card-meta">
              <span>Ride priority</span>
              {alert.relatedRideGroup ? (
                <PriorityScoreBadge score={alert.relatedRideGroup.priorityScore} />
              ) : (
                <StatusBadge value="No linked ride group" tone="muted" />
              )}
            </div>
          </div>
          <div className="alert-card-action">
            <span>{alert.relatedZone}</span>
            <strong>{alert.suggestedAction}</strong>
          </div>
        </article>
      ))}
    </div>
  );

  if (embedded) return content;

  return (
    <Panel
      title="Alerts Requiring Intervention"
      subtitle="Current exceptions that need coordination review, reassignment, or route correction before they escalate."
      actions={actions}
    >
      {content}
    </Panel>
  );
}
