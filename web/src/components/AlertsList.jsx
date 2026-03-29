import Panel from './Panel';
import StatusBadge from './StatusBadge';

export default function AlertsList({ alerts, onSelectAlert, compact = true, embedded = false, actions = null }) {
  const content = (
    <div className={`alerts-list${compact ? ' alerts-list-compact' : ''}`}>
      {alerts.map((alert) => (
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
