export default function MapLegend() {
  const items = [
    ['ride-group', 'Ride Group'],
    ['driver', 'Driver'],
    ['pickup', 'Pickup Point'],
    ['restricted', 'Restricted Zone'],
    ['conflict-red', 'Conflict Zone (Red)'],
    ['conflict-orange', 'Conflict Zone (Orange)'],
    ['conflict-yellow', 'Conflict Zone (Yellow)'],
    ['alert-area', 'Active Alert Area'],
  ];

  return (
    <div className="map-legend map-legend-rich">
      {items.map(([type, label]) => (
        <div key={type} className="legend-item">
          <span className={`legend-swatch legend-swatch-${type}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
