import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

const RISK_COLORS = {
  critical: '#ef5350',
  high: '#ffa726',
  moderate: '#42a5f5',
  low: '#66bb6a',
};

export default function ZoneDrawer({ zones = [], onDraw }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

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

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw);
    drawRef.current = draw;

    function handleDraw() {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[data.features.length - 1];
        onDraw(feature.geometry);
      } else {
        onDraw(null);
      }
    }

    map.on('draw.create', handleDraw);
    map.on('draw.update', handleDraw);
    map.on('draw.delete', () => onDraw(null));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onDraw]);

  // Update existing zone overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      if (map.getLayer('existing-zones-fill')) map.removeLayer('existing-zones-fill');
      if (map.getLayer('existing-zones-outline')) map.removeLayer('existing-zones-outline');
      if (map.getSource('existing-zones')) map.removeSource('existing-zones');

      if (zones.length === 0) return;

      const features = zones
        .filter((z) => z.geometry)
        .map((z) => ({
          type: 'Feature',
          properties: { risk_level: z.risk_level, name: z.name },
          geometry: z.geometry,
        }));

      map.addSource('existing-zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map.addLayer({
        id: 'existing-zones-fill',
        type: 'fill',
        source: 'existing-zones',
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
          'fill-opacity': 0.2,
        },
      });

      map.addLayer({
        id: 'existing-zones-outline',
        type: 'line',
        source: 'existing-zones',
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
          'line-dasharray': [3, 2],
        },
      });
    };

    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [zones]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />;
}
