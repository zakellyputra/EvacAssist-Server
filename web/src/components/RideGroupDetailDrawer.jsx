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
  const { alerts, requestRideGroupAction, openAlert } = useOperations();
  const linkedAlerts = alerts.filter((alert) => rideGroup.linkedAlertIds.includes(alert.id));

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
              <span>Corridor</span>
              <strong>{rideGroup.corridor}</strong>
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Capacity & Assignment</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Riders joined</span>
              <strong>{rideGroup.ridersJoined}</strong>
            </div>
            <div className="detail-item">
              <span>Max capacity</span>
              <strong>{rideGroup.capacity}</strong>
            </div>
            <div className="detail-item">
              <span>Assigned driver</span>
              <strong>{rideGroup.driver}</strong>
            </div>
            <div className="detail-item">
              <span>Departure readiness</span>
              <strong>{rideGroup.departureReadiness}</strong>
            </div>
            <div className="detail-item">
              <span>Created</span>
              <strong>{formatDate(rideGroup.createdAt)}</strong>
            </div>
            <div className="detail-item">
              <span>Last updated</span>
              <strong>{formatDate(rideGroup.updatedAt)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-block">
          <h3>Rider Manifest</h3>
          <div className="manifest-list">
            {rideGroup.riders.map((rider) => (
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
          </div>
        </section>

        <section className="detail-block">
          <h3>Operational Notes</h3>
          <div className="note-list">
            {rideGroup.routeNotes.map((note) => <p key={note}>{note}</p>)}
            {rideGroup.pickupIssues.map((issue) => <p key={issue}>{issue}</p>)}
          </div>
        </section>

        <section className="detail-block">
          <h3>Linked Alerts</h3>
          {linkedAlerts.length ? (
            <div className="linked-list">
              {linkedAlerts.map((alert) => (
                <button key={alert.id} type="button" className="linked-entity" onClick={() => openAlert(alert.id)}>
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.relatedZone}</span>
                  </div>
                  <StatusBadge value={alert.status} tone={alert.status === 'Resolved' ? 'default' : alert.severityTone} />
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No linked alerts are attached to this group right now.</p>
          )}
        </section>
      </div>

      <div className="detail-drawer-actions">
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Close Joining', rideGroup.id)}>Close Joining</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Reopen Group', rideGroup.id)}>Reopen Group</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Mark Flagged', rideGroup.id)}>Mark Flagged</button>
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Resolve Flag', rideGroup.id)}>Resolve Flag</button>
        <button type="button" className="button button-primary" onClick={() => requestRideGroupAction('Cancel Group', rideGroup.id)}>Cancel Group</button>
      </div>
    </aside>
  );
}
