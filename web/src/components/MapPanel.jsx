import Panel from './Panel';
import StatusBadge from './StatusBadge';

export default function MapPanel({ data }) {
  return (
    <Panel
      title="Live Operations Map"
      subtitle="Tracked ride groups, pickup clusters, field units, and restricted corridors arranged as a command-surface preview while live mapping is being wired."
      actions={<StatusBadge value="Simulation View" tone="default" />}
      className="map-panel"
    >
      <div className="map-panel-meta">
        {data.summary.map((item) => (
          <div key={item.label} className="map-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="ops-map">
        <div className="ops-map-grid" />

        {data.zones.map((zone) => (
          <div
            key={zone.id}
            className={`map-zone map-zone-${zone.tone}`}
            style={zone.style}
          >
            <span>{zone.label}</span>
          </div>
        ))}

        {data.routes.map((route) => (
          <div
            key={route.id}
            className={`map-route map-route-${route.tone}`}
            style={route.style}
          />
        ))}

        {data.markers.map((marker) => (
          <div
            key={marker.id}
            className={`map-marker map-marker-${marker.type}`}
            style={marker.style}
          >
            <span>{marker.label}</span>
          </div>
        ))}

        {data.annotations.map((annotation) => (
          <div key={annotation.id} className="map-annotation" style={annotation.style}>
            <strong>{annotation.title}</strong>
            <span>{annotation.text}</span>
          </div>
        ))}
      </div>

      <div className="map-legend">
        {data.legend.map((item) => (
          <div key={item.label} className="legend-item">
            <span className={`legend-swatch legend-swatch-${item.type}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
