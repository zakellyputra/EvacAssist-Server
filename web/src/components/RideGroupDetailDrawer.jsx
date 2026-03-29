import { Link } from 'react-router-dom';
import AIDispatchAssistantPanel from './AIDispatchAssistantPanel';
import ActionStateBadge from './ActionStateBadge';
import AuditTrailPanel from './AuditTrailPanel';
import DepartureReadinessPanel from './DepartureReadinessPanel';
import DriverIssueBadge from './DriverIssueBadge';
import DriverContextCard from './DriverContextCard';
import LinkedAlertsPanel from './LinkedAlertsPanel';
import OperatorActionPanel from './OperatorActionPanel';
import RideGroupOperationalNotes from './RideGroupOperationalNotes';
import { useOperations } from '../operations';
import StatusBadge from './StatusBadge';
import { formatConflictCount, getConflictSeverityTone } from '../utils/conflictDisplay';

function formatDate(value) {
  if (!value) return 'Unavailable';
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

export default function RideGroupDetailDrawer({ rideGroup, open = false, onClose }) {
  if (!open) return null;

  if (!rideGroup) {
    return (
      <aside className="detail-drawer" aria-label="Ride group details unavailable">
        <div className="detail-drawer-header">
          <div className="detail-drawer-heading">
            <p className="kicker">Ride Group Detail</p>
            <h2>Unavailable</h2>
            <p>The selected ride group record is no longer available in the active workspace.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    );
  }

  const { alerts, requestRideGroupAction, openAlert } = useOperations();
  const linkedAlertIds = Array.isArray(rideGroup.linkedAlertIds) ? rideGroup.linkedAlertIds : [];
  const riders = Array.isArray(rideGroup.riders) ? rideGroup.riders : [];
  const linkedAlerts = rideGroup.linkedAlerts ?? (Array.isArray(alerts) ? alerts : []).filter((alert) => linkedAlertIds.includes(alert.id));
  const activeIssues = Array.isArray(rideGroup.activeIssues) ? rideGroup.activeIssues : [];
  const driverAssignment = rideGroup.driverAssignment ?? {
    assigned: Boolean(rideGroup.driverContext),
    name: rideGroup.driverContext?.displayName ?? null,
    unitId: rideGroup.driverUnitId ?? null,
    status: rideGroup.driverContext?.operationalState ?? 'No driver assigned',
    vehicleLabel: rideGroup.vehicle ?? null,
  };
  const schemaRefs = rideGroup.schemaRefs ?? {};
  const schemaStatus = rideGroup.schemaStatus ?? {};
  const recommendations = Array.isArray(rideGroup.recommendations) ? rideGroup.recommendations : [];
  const timeline = Array.isArray(rideGroup.timeline) ? rideGroup.timeline : [];
  const auditTrail = Array.isArray(rideGroup.auditTrail) ? rideGroup.auditTrail : [];
  const conflicts = Array.isArray(rideGroup.conflicts) ? rideGroup.conflicts : [];
  const conflictDataStatus = rideGroup.conflictDataStatus ?? 'idle';

  return (
    <aside className="detail-drawer" aria-label={`Ride group ${rideGroup.id} details`}>
      <div className="detail-drawer-header">
        <div className="detail-drawer-heading">
          <p className="kicker">Ride Group Detail</p>
          <h2>{rideGroup.id}</h2>
          <p>{rideGroup.summary}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="detail-drawer-body">
        <section className="detail-block">
          <h3>Group Summary</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Lifecycle status</span>
              <StatusBadge value={rideGroup.lifecycleStatus ?? rideGroup.status} tone={rideGroup.status === 'Flagged' ? 'strong' : rideGroup.status === 'Open' || rideGroup.status === 'Filling' ? 'muted' : 'default'} />
            </div>
            <div className="detail-item">
              <span>Operational state</span>
              <ActionStateBadge value={rideGroup.actionState ?? 'PENDING'} />
            </div>
            <div className="detail-item">
              <span>Priority score</span>
              <strong>{rideGroup.priorityScore ?? 0}</strong>
            </div>
            <div className="detail-item">
              <span>Zone</span>
              <strong>{rideGroup.zone ?? 'Zone unavailable'}</strong>
            </div>
            <div className="detail-item">
              <span>Pickup point</span>
              <strong>{rideGroup.pickupPoint ?? 'Pickup point unavailable'}</strong>
            </div>
            <div className="detail-item">
              <span>Riders / capacity</span>
              <strong>{rideGroup.assignedRiderCount ?? rideGroup.ridersJoined ?? 0} / {rideGroup.capacity ?? 'Unknown'}</strong>
            </div>
            <div className="detail-item">
              <span>Created</span>
              <strong>{formatDate(rideGroup.createdAt)}</strong>
            </div>
            <div className="detail-item">
              <span>Last updated</span>
              <strong>{formatDate(rideGroup.updatedAt)}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span>Operational summary</span>
              <strong>{rideGroup.summary ?? 'Operational summary unavailable.'}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span>Schema references</span>
              <strong>
                Trip {schemaRefs.tripId ?? 'Unavailable'} · Request {schemaRefs.requestId ?? 'Unavailable'} · Vehicle {schemaRefs.vehicleId ?? 'Unassigned'}
              </strong>
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Capacity & Assignment</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Assigned driver</span>
              <strong>{driverAssignment.name ?? 'No driver assigned'}</strong>
            </div>
            <div className="detail-item">
              <span>Driver unit / vehicle</span>
              <strong>{driverAssignment.unitId ?? 'No unit assigned'}{driverAssignment.vehicleLabel ? ` · ${driverAssignment.vehicleLabel}` : ''}</strong>
            </div>
            <div className="detail-item">
              <span>Driver status</span>
              <strong>{driverAssignment.status ?? 'Driver status unavailable'}</strong>
            </div>
            <div className="detail-item">
              <span>Departure readiness</span>
              <strong>{rideGroup.departureReadiness ?? 'Readiness data unavailable'}</strong>
            </div>
            <div className="detail-item">
              <span>Trip status</span>
              <strong>{schemaStatus.trip ?? 'Unavailable'}</strong>
            </div>
            <div className="detail-item">
              <span>Request status</span>
              <strong>{schemaStatus.request ?? 'Unavailable'}</strong>
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Recommendations</h3>
          {recommendations.length ? (
            <div className="linked-list">
              {recommendations.map((recommendation) => (
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
            <p className="empty-copy">No decision-support recommendations are active for this ride group.</p>
          )}
        </section>

        <section className="detail-block">
          <h3>Conflicts</h3>
          {conflictDataStatus === 'loading' || conflictDataStatus === 'idle' ? (
            <p className="empty-copy">Loading conflict data...</p>
          ) : null}
          {conflictDataStatus === 'error' && !conflicts.length ? (
            <p className="empty-copy">Conflict details unavailable</p>
          ) : null}
          {conflictDataStatus === 'ready' && conflicts.length ? (
            <div className="linked-list">
              {conflicts.map((conflict) => (
                <article key={conflict.id} className="linked-entity">
                  <div>
                    <strong>{conflict.label}</strong>
                    <span>{conflict.message ?? 'Conflict details unavailable'}</span>
                    {conflict.details ? <span>{conflict.details}</span> : null}
                    {conflict.relatedEntitySummary ? <span>{conflict.relatedEntitySummary}</span> : null}
                  </div>
                  <div className="linked-entity-meta">
                    <StatusBadge
                      value={conflict.severity ? conflict.severity.charAt(0).toUpperCase() + conflict.severity.slice(1) : 'Unknown'}
                      tone={getConflictSeverityTone(conflict.severity)}
                    />
                    <StatusBadge value={conflict.blocking ? 'Blocking' : 'Non-blocking'} tone={conflict.blocking ? 'strong' : 'default'} />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {conflictDataStatus === 'ready' && !conflicts.length ? (
            <p className="empty-copy">No active conflicts</p>
          ) : null}
          {rideGroup.hasActiveConflicts ? (
            <p className="inline-meta">
              {formatConflictCount(rideGroup.activeConflictCount)}
              {rideGroup.hasBlockingConflicts ? ' · Blocking conflicts present' : ' · No blocking conflicts'}
            </p>
          ) : null}
        </section>

        <section className="detail-block">
          <h3>Active Issues</h3>
          {activeIssues.length ? (
            <div className="linked-entity-meta">
              {activeIssues.map((issue) => <DriverIssueBadge key={issue.id} issue={issue} />)}
            </div>
          ) : (
            <p className="empty-copy">No active issues</p>
          )}
        </section>

        <DriverContextCard driverContext={rideGroup.driverContext} assignedRideGroupId={rideGroup.id} />
        <DepartureReadinessPanel
          detail={rideGroup.departureReadinessDetail}
          riderCount={rideGroup.assignedRiderCount ?? rideGroup.ridersJoined}
          capacity={rideGroup.capacity}
          readinessState={rideGroup.readinessState}
        />

        <section className="detail-block">
          <h3>Rider Manifest</h3>
          <div className="manifest-list">
            {riders.map((rider) => (
              <article key={rider.id} className="manifest-row">
                <div>
                  <strong>{rider.name}</strong>
                  <span>{rider.id}</span>
                </div>
                <div>
                  <strong>{rider.checkInState}</strong>
                  <span>{rider.assignmentState}</span>
                </div>
              </article>
            ))}
            {!riders.length ? <p className="empty-copy">No rider manifest entries are attached to this group right now.</p> : null}
          </div>
        </section>

        <LinkedAlertsPanel alerts={linkedAlerts} onOpenAlert={openAlert} />
        <RideGroupOperationalNotes routeNotes={rideGroup.routeNotes} pickupIssues={rideGroup.pickupIssues} />
        <OperatorActionPanel rideGroup={rideGroup} />
        <AuditTrailPanel entries={auditTrail} />
        <AIDispatchAssistantPanel rideGroup={rideGroup} />

        <section className="detail-block">
          <h3>Timeline</h3>
          {timeline.length ? (
            <div className="note-list">
              {timeline.map((event) => (
                <p key={`${event.timestamp}-${event.type}`}>
                  <strong>{formatDate(event.timestamp)}</strong>
                  {' '}
                  {event.description}
                </p>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No timeline events are available for this ride group.</p>
          )}
        </section>
      </div>

      <div className="detail-drawer-actions">
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Close Joining', rideGroup.id)}>Close Joining</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Reopen Group', rideGroup.id)}>Reopen Group</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Mark Flagged', rideGroup.id)}>Mark Flagged</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Resolve Flag', rideGroup.id)}>Resolve Flag</button>
        <Link className="button button-secondary" to="/ride-groups">Open Ride Groups</Link>
        <button type="button" className="button button-primary" onClick={() => requestRideGroupAction('Cancel Group', rideGroup.id)}>Cancel Group</button>
      </div>
    </aside>
  );
}
