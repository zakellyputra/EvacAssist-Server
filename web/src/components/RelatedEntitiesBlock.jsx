export default function RelatedEntitiesBlock({ rideGroupId, zone, assignedDriver, pickupPoint }) {
  return (
    <section className="detail-block">
      <h3>Related Entities</h3>
      <div className="detail-grid">
        <div className="detail-item">
          <span>Ride group</span>
          <strong>{rideGroupId ?? 'No linked group'}</strong>
        </div>
        <div className="detail-item">
          <span>Zone</span>
          <strong>{zone ?? 'Unavailable'}</strong>
        </div>
        <div className="detail-item">
          <span>Assigned driver</span>
          <strong>{assignedDriver ?? 'No driver assigned'}</strong>
        </div>
        <div className="detail-item">
          <span>Pickup point</span>
          <strong>{pickupPoint ?? 'Not specified'}</strong>
        </div>
      </div>
    </section>
  );
}
