export default function DepartureReadinessPanel({ detail, riderCount, capacity }) {
  return (
    <section className="detail-block">
      <h3>Departure Readiness</h3>
      <div className="detail-grid">
        <div className="detail-item">
          <span>Driver assigned</span>
          <strong>{detail.driverAssigned}</strong>
        </div>
        <div className="detail-item">
          <span>Minimum riders reached</span>
          <strong>{detail.minimumRidersReached}</strong>
        </div>
        <div className="detail-item">
          <span>Rider check-in</span>
          <strong>{detail.riderCheckIn ?? `${riderCount} of ${capacity} confirmed`}</strong>
        </div>
        <div className="detail-item">
          <span>Route advisory</span>
          <strong>{detail.routeAdvisory}</strong>
        </div>
        <div className="detail-item detail-item-wide">
          <span>Departure readiness</span>
          <strong>{detail.readinessEstimate}</strong>
        </div>
      </div>
    </section>
  );
}
