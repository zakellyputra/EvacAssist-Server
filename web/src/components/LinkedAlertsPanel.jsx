import StatusBadge from './StatusBadge';
import ActionStateBadge from './ActionStateBadge';

export default function LinkedAlertsPanel({ alerts, onOpenAlert }) {
  return (
    <section className="detail-block">
      <h3>Linked Alerts</h3>
      {alerts.length ? (
        <div className="linked-list">
          {alerts.map((alert) => (
            <button key={alert.id} type="button" className="linked-entity" onClick={() => onOpenAlert(alert.id)}>
              <div>
                <strong>{alert.code ? `${alert.code} · ${alert.title}` : alert.title}</strong>
                <span>{alert.description}</span>
              </div>
              <div className="linked-entity-meta">
                <StatusBadge value={alert.severity} tone={alert.severityTone} />
                <ActionStateBadge value={alert.status} />
                <span>{alert.relatedZone}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-copy">No linked alerts are attached to this item right now.</p>
      )}
    </section>
  );
}
