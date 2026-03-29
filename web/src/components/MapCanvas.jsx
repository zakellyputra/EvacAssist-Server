import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function buildFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => feature.geometry),
  };
}

export default function MapCanvas({ data, selectedMapItem, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const selectedRef = useRef(selectedMapItem);

  selectedRef.current = selectedMapItem;

  const zoneCollection = useMemo(() => buildFeatureCollection(data.zones), [data.zones]);
  const alertCollection = useMemo(() => buildFeatureCollection(data.alertAreas), [data.alertAreas]);

  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: data.center,
      zoom: data.zoom,
      style: {
        version: 8,
        sources: {
          base: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'base',
            type: 'raster',
            source: 'base',
            paint: {
              'raster-saturation': -1,
              'raster-contrast': -0.15,
              'raster-brightness-min': 0.2,
              'raster-brightness-max': 0.98,
            },
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [data.center, data.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    let cleanup = () => {};

    function applyLayers() {
      if (map.getSource('ops-zones')) {
        map.getSource('ops-zones').setData(zoneCollection);
      } else {
        map.addSource('ops-zones', { type: 'geojson', data: zoneCollection });
        map.addLayer({
          id: 'ops-zones-fill',
          type: 'fill',
          source: 'ops-zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'tone'],
              'restricted', '#1c1c1c',
              '#61615c',
            ],
            'fill-opacity': 0.08,
          },
        });
        map.addLayer({
          id: 'ops-zones-line',
          type: 'line',
          source: 'ops-zones',
          paint: {
            'line-color': '#40403d',
            'line-width': 2,
          },
        });
      }

      if (map.getSource('ops-alert-areas')) {
        map.getSource('ops-alert-areas').setData(alertCollection);
      } else {
        map.addSource('ops-alert-areas', { type: 'geojson', data: alertCollection });
        map.addLayer({
          id: 'ops-alert-areas-line',
          type: 'line',
          source: 'ops-alert-areas',
          paint: {
            'line-color': '#111111',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      }

      const handleZoneClick = (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id;
        if (id) onSelect('zone', id);
      };
      const handleAlertClick = (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id;
        if (id) onSelect('alertArea', id);
      };

      map.on('click', 'ops-zones-fill', handleZoneClick);
      map.on('click', 'ops-alert-areas-line', handleAlertClick);

      cleanup = () => {
        if (map.getLayer('ops-zones-fill')) map.off('click', 'ops-zones-fill', handleZoneClick);
        if (map.getLayer('ops-alert-areas-line')) map.off('click', 'ops-alert-areas-line', handleAlertClick);
      };
    }

    if (map.isStyleLoaded()) applyLayers();
    else map.once('load', applyLayers);

    return () => {
      cleanup();
    };
  }, [alertCollection, onSelect, zoneCollection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const entries = [
      ...data.rideGroups.map((item) => ({ ...item, type: 'rideGroup', coordinates: item.coordinates, label: item.rideGroup.id })),
      ...data.drivers.map((item) => ({ ...item, type: 'driver', coordinates: item.coordinates, label: item.unitId })),
      ...data.pickupPoints.map((item) => ({ ...item, type: 'pickup', coordinates: item.coordinates, label: item.name })),
    ];

    entries.forEach((entry) => {
      const el = document.createElement('button');
      el.type = 'button';
      const selectedId = selectedRef.current?.item?.id ?? selectedRef.current?.id;
      el.className = `map-marker-node map-marker-node-${entry.type}${selectedRef.current?.type === entry.type && selectedId === entry.id ? ' is-selected' : ''}`;
      el.innerHTML = `<span>${entry.label}</span>`;
      el.addEventListener('click', () => onSelect(entry.type, entry.id));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(entry.coordinates)
        .addTo(map);
      markerRefs.current.push(marker);
    });
  }, [data.drivers, data.pickupPoints, data.rideGroups, onSelect, selectedMapItem]);

  return <div ref={containerRef} className="live-map-canvas" />;
}
