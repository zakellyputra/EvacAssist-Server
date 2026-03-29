import { Link } from 'react-router-dom';
import PriorityScoreBadge from './PriorityScoreBadge';
import StatusBadge from './StatusBadge';
import { formatConflictCount, getConflictSeverityTone } from '../utils/conflictDisplay';

export default function DashboardExceptionSummary({ summary, onOpenAlert, onOpenRideGroup }) {
  const relatedAlerts = [...(summary.relatedAlerts ?? [])].sort(
    (a, b) => Number(b.relatedRideGroup?.hasBlockingConflicts) - Number(a.relatedRideGroup?.hasBlockingConflicts)
      || (b.relatedRideGroup?.activeConflictCount ?? 0) - (a.relatedRideGroup?.activeConflictCount ?? 0)
      || (b.relatedRideGroup?.priorityScore ?? 0) - (a.relatedRideGroup?.priorityScore ?? 0)
      || (b.priorityScore ?? 0) - (a.priorityScore ?? 0),
  );
  const conflictRideGroups = [...(summary.conflictRideGroups ?? [])];

  return (
    <section className="detail-block exception-summary">
      <div className="exception-summary-header">
        <div>
          <h3>Operational Conflicts</h3>
          <p>What is broken right now across assignments, readiness, and backend-detected blocking conflicts.</p>
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
        {conflictRideGroups.map((rideGroup) => (
          <button
            key={rideGroup.id}
            type="button"
            className="linked-entity"
            onClick={() => onOpenRideGroup?.(rideGroup.id)}
          >
            <div>
              <strong>{rideGroup.id}</strong>
              <span>{rideGroup.pickupPoint} · {rideGroup.zone}</span>
              <span>{formatConflictCount(rideGroup.activeConflictCount)}</span>
            </div>
            <div className="linked-entity-meta">
              {rideGroup.highestConflictSeverity ? (
                <StatusBadge
                  value={rideGroup.highestConflictSeverity.charAt(0).toUpperCase() + rideGroup.highestConflictSeverity.slice(1)}
                  tone={getConflictSeverityTone(rideGroup.highestConflictSeverity)}
                />
              ) : null}
              {rideGroup.hasBlockingConflicts ? <StatusBadge value="Blocking" tone="strong" /> : null}
              <PriorityScoreBadge score={rideGroup.priorityScore} />
            </div>
          </button>
        ))}
        {!conflictRideGroups.length ? <p className="empty-copy">No active blocking conflicts are currently surfaced on the dashboard.</p> : null}
      </div>

      <div className="linked-list">
        {relatedAlerts.map((alert) => (
          <button key={alert.id} type="button" className="linked-entity" onClick={() => onOpenAlert(alert.id)}>
            <div>
              <strong>{alert.title}</strong>
              <span>{alert.relatedRideGroup ? `${alert.relatedRideGroup.id} · ${alert.assignedDriver ?? alert.relatedZone}` : (alert.assignedDriver ?? alert.relatedZone)}</span>
            </div>
            <div className="linked-entity-meta">
              {alert.relatedRideGroup ? <PriorityScoreBadge score={alert.relatedRideGroup.priorityScore} /> : <span>No linked ride group</span>}
              {alert.relatedRideGroup?.highestConflictSeverity ? (
                <StatusBadge
                  value={alert.relatedRideGroup.highestConflictSeverity.charAt(0).toUpperCase() + alert.relatedRideGroup.highestConflictSeverity.slice(1)}
                  tone={getConflictSeverityTone(alert.relatedRideGroup.highestConflictSeverity)}
                />
              ) : null}
              {alert.relatedRideGroup?.hasBlockingConflicts ? <StatusBadge value="Blocking conflict" tone="strong" /> : null}
              <span>{alert.relatedRideGroup?.readinessState === 'BLOCKED' ? 'Blocked' : 'Monitoring'}</span>
              <span>{alert.relatedRideGroup?.driverAssignment?.assigned ? 'Driver assigned' : 'No driver assigned'}</span>
            </div>
          </button>
        ))}
        {!relatedAlerts.length ? <p className="empty-copy">No alert-linked conflict items are currently active.</p> : null}
      </div>
    </section>
  );
}
