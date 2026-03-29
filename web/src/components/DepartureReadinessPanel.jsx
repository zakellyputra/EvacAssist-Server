export default function DepartureReadinessPanel({ detail, riderCount, capacity }) {
  if (!detail) {
    return (
      <section className="detail-block">
        <h3>Departure Readiness</h3>
        <p className="empty-copy">Departure readiness details are temporarily unavailable for this group.</p>
      </section>
    );
  }

  return (
    <section className="detail-block">
      <h3>Departure Readiness</h3>
      <div className="detail-grid">
        <div className="detail-item">
          <span>Driver assigned</span>
          <strong>{detail.driverAssigned ?? 'Unknown'}</strong>
        </div>
        <div className="detail-item">
          <span>Minimum riders reached</span>
          <strong>{detail.minimumRidersReached ?? 'Unknown'}</strong>
        </div>
        <div className="detail-item">
          <span>Rider check-in</span>
          <strong>{detail.riderCheckIn ?? `${riderCount} of ${capacity} confirmed`}</strong>
        </div>
        <div className="detail-item">
          <span>Route advisory</span>
          <strong>{detail.routeAdvisory ?? 'No advisory recorded'}</strong>
        </div>
        <div className="detail-item detail-item-wide">
          <span>Departure readiness</span>
          <strong>{detail.readinessEstimate ?? 'Pending update'}</strong>
        </div>
      </div>
    </section>
  );
}
