import { Link } from 'react-router-dom';

export default function DashboardExceptionSummary({ summary, onOpenAlert }) {
  return (
    <section className="detail-block exception-summary">
      <div className="exception-summary-header">
        <div>
          <h3>Driver-Linked Exceptions</h3>
          <p>Compact oversight for units that are delayed, stopped reporting, or causing reassignment pressure.</p>
        </div>
        <Link className="button button-secondary button-inline" to="/alerts">
          Open Alerts
        </Link>
      </div>

      <div className="detail-grid">
        <div className="detail-item">
          <span>Units delayed</span>
          <strong>{summary.delayedUnits}</strong>
        </div>
        <div className="detail-item">
          <span>Stopped reporting</span>
          <strong>{summary.stoppedReportingUnits}</strong>
        </div>
        <div className="detail-item">
          <span>Awaiting reassignment</span>
          <strong>{summary.awaitingReassignment}</strong>
        </div>
        <div className="detail-item">
          <span>Awaiting departure readiness</span>
          <strong>{summary.awaitingDepartureReadiness}</strong>
        </div>
      </div>

      <div className="linked-list">
        {summary.relatedAlerts.map((alert) => (
          <button key={alert.id} type="button" className="linked-entity" onClick={() => onOpenAlert(alert.id)}>
            <div>
              <strong>{alert.title}</strong>
              <span>{alert.assignedDriver ?? alert.relatedZone}</span>
            </div>
            <div className="linked-entity-meta">
              <span>{alert.relatedGroupId ?? 'No group'}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
