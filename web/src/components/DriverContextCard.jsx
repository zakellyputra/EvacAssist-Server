import DriverIssueBadge from './DriverIssueBadge';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function DriverContextCard({ driverContext, assignedRideGroupId = null }) {
  if (!driverContext) {
    return (
      <section className="detail-block">
        <h3>Driver Context</h3>
        <p className="empty-copy">No assigned driver context is available for this item right now.</p>
      </section>
    );
  }

  return (
    <section className="detail-block">
      <h3>Driver Context</h3>
      <div className="detail-grid">
        <div className="detail-item">
          <span>Unit ID</span>
          <strong>{driverContext.unitId}</strong>
        </div>
        <div className="detail-item">
          <span>Driver</span>
          <strong>{driverContext.displayName}</strong>
        </div>
        <div className="detail-item">
          <span>Current status</span>
          <strong>{driverContext.operationalState}</strong>
        </div>
        <div className="detail-item">
          <span>Latest update</span>
          <strong>{formatDate(driverContext.lastUpdated)}</strong>
        </div>
        <div className="detail-item">
          <span>Zone</span>
          <strong>{driverContext.zone}</strong>
        </div>
        {assignedRideGroupId ? (
          <div className="detail-item">
            <span>Assigned ride group</span>
            <strong>{assignedRideGroupId}</strong>
          </div>
        ) : null}
      </div>
      {driverContext.issueState ? (
        <div className="driver-issue-row">
          <span>Issue state</span>
          <DriverIssueBadge issue={driverContext.issueState} />
        </div>
      ) : null}
      <div className="driver-note">
        <span>Readiness / movement note</span>
        <p>{driverContext.quickNote}</p>
      </div>
    </section>
  );
}
