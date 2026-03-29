import { Link } from 'react-router-dom';
import DepartureReadinessPanel from './DepartureReadinessPanel';
import DriverContextCard from './DriverContextCard';
import LinkedAlertsPanel from './LinkedAlertsPanel';
import RideGroupOperationalNotes from './RideGroupOperationalNotes';
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

export default function RideGroupDetailDrawer({ rideGroup, onClose }) {
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
  const linkedAlerts = (Array.isArray(alerts) ? alerts : []).filter((alert) => linkedAlertIds.includes(alert.id));

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
              <span>Status</span>
              <StatusBadge value={rideGroup.status} tone={rideGroup.status === 'Flagged' ? 'strong' : rideGroup.status === 'Open' || rideGroup.status === 'Filling' ? 'muted' : 'default'} />
            </div>
            <div className="detail-item">
              <span>Zone</span>
              <strong>{rideGroup.zone}</strong>
            </div>
            <div className="detail-item">
              <span>Pickup point</span>
              <strong>{rideGroup.pickupPoint}</strong>
            </div>
            <div className="detail-item">
              <span>Riders / capacity</span>
              <strong>{rideGroup.ridersJoined} / {rideGroup.capacity}</strong>
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
              <strong>{rideGroup.summary}</strong>
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Capacity & Assignment</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Assigned driver</span>
              <strong>{rideGroup.driver}</strong>
            </div>
            <div className="detail-item">
              <span>Driver unit</span>
              <strong>{rideGroup.driverUnitId ?? 'Pending assignment'}</strong>
            </div>
            <div className="detail-item">
              <span>Departure readiness</span>
              <strong>{rideGroup.departureReadiness}</strong>
            </div>
            <div className="detail-item">
              <span>Intervention state</span>
              <strong>{rideGroup.interventionState}</strong>
            </div>
          </div>
        </section>

        <DriverContextCard driverContext={rideGroup.driverContext} assignedRideGroupId={rideGroup.id} />
        <DepartureReadinessPanel
          detail={rideGroup.departureReadinessDetail}
          riderCount={rideGroup.ridersJoined}
          capacity={rideGroup.capacity}
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
