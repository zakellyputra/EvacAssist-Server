import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RISK_COLORS = {
  critical: '#ef5350',
  high: '#ffa726',
  moderate: '#42a5f5',
  low: '#66bb6a',
};

export default function LiveMap({ zones = [], incidents = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [36.8, 1.3],
      zoom: 6,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update zone overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      const onLoad = () => updateZones(map, zones);
      map?.once('load', onLoad);
      return () => map?.off('load', onLoad);
    }
    updateZones(map, zones);
  }, [zones]);

  // Update incident markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      incidents.forEach((inc) => {
        if (!inc.location?.coordinates) return;
        const [lng, lat] = inc.location.coordinates;

        const el = document.createElement('div');
        el.style.cssText =
          'width:12px;height:12px;background:#ef5350;border-radius:50%;border:2px solid #fff;cursor:pointer;';

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 10 }).setHTML(
              `<strong>${inc.event_type || 'Incident'}</strong><br/>Severity: ${inc.severity ?? 'N/A'}<br/>Confidence: ${inc.confidence ?? 'N/A'}`,
            ),
          )
          .addTo(map);
      });
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [incidents]);

  return <div ref={containerRef} className="map-container" />;
}

function updateZones(map, zones) {
  // Remove old source/layer if they exist
  if (map.getLayer('zones-fill')) map.removeLayer('zones-fill');
  if (map.getLayer('zones-outline')) map.removeLayer('zones-outline');
  if (map.getSource('zones')) map.removeSource('zones');

  if (zones.length === 0) return;

  const features = zones
    .filter((z) => z.geometry)
    .map((z) => ({
      type: 'Feature',
      properties: { risk_level: z.risk_level, name: z.name },
      geometry: z.geometry,
    }));

  map.addSource('zones', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });

  map.addLayer({
    id: 'zones-fill',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': [
        'match',
        ['get', 'risk_level'],
        'critical', RISK_COLORS.critical,
        'high', RISK_COLORS.high,
        'moderate', RISK_COLORS.moderate,
        'low', RISK_COLORS.low,
        '#888',
      ],
      'fill-opacity': 0.25,
    },
  });

  map.addLayer({
    id: 'zones-outline',
    type: 'line',
    source: 'zones',
    paint: {
      'line-color': [
        'match',
        ['get', 'risk_level'],
        'critical', RISK_COLORS.critical,
        'high', RISK_COLORS.high,
        'moderate', RISK_COLORS.moderate,
        'low', RISK_COLORS.low,
        '#888',
      ],
      'line-width': 2,
    },
  });
}
