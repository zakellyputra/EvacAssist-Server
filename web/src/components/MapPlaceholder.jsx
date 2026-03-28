export default function MapPlaceholder({ title = 'Map coverage', message = 'Map and live overlays will render here as backend integrations expand.' }) {
  return (
    <div className="map-placeholder">
      <div className="map-placeholder-grid" />
      <div className="map-placeholder-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
