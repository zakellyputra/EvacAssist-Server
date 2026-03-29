export default function MapLegend() {
  const items = [
    ['ride-group', 'Ride Group'],
    ['driver', 'Driver'],
    ['pickup', 'Pickup Point'],
    ['restricted', 'Restricted Zone'],
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
