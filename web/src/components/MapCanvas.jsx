import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatPriorityValue, getPriorityBand } from '../utils/priorityDisplay';

function buildFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features: (Array.isArray(features) ? features : [])
      .map((feature) => feature?.geometry)
      .filter(Boolean),
  };
}

export default function MapCanvas({ data, selectedMapItem, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const selectedRef = useRef(selectedMapItem);

  selectedRef.current = selectedMapItem;

  const rideGroups = Array.isArray(data?.rideGroups) ? data.rideGroups : [];
  const drivers = Array.isArray(data?.drivers) ? data.drivers : [];
  const pickupPoints = Array.isArray(data?.pickupPoints) ? data.pickupPoints : [];
  const zones = Array.isArray(data?.zones) ? data.zones : [];
  const alertAreas = Array.isArray(data?.alertAreas) ? data.alertAreas : [];

  const zoneCollection = useMemo(() => buildFeatureCollection(zones), [zones]);
  const alertCollection = useMemo(() => buildFeatureCollection(alertAreas), [alertAreas]);

  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: data?.center ?? [-73.9857, 40.7484],
      zoom: data?.zoom ?? 12,
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

    let isDisposed = false;
    let cleanup = () => {};

    function applyLayers() {
      if (isDisposed) return;

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
        if (isDisposed) return;
        if (!mapRef.current || mapRef.current !== map) return;

        try {
          if (map.getLayer('ops-zones-fill')) map.off('click', 'ops-zones-fill', handleZoneClick);
        } catch {}

        try {
          if (map.getLayer('ops-alert-areas-line')) map.off('click', 'ops-alert-areas-line', handleAlertClick);
        } catch {}
      };
    }

    if (map.isStyleLoaded()) applyLayers();
    else map.once('load', applyLayers);

    return () => {
      isDisposed = true;
      cleanup();
    };
  }, [alertCollection, onSelect, zoneCollection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const entries = [
      ...rideGroups
        .filter((item) => item?.coordinates && item?.rideGroup?.id)
        .map((item) => ({ ...item, type: 'rideGroup', coordinates: item.coordinates, label: item.rideGroup.id })),
      ...drivers
        .filter((item) => item?.coordinates && item?.unitId)
        .map((item) => ({ ...item, type: 'driver', coordinates: item.coordinates, label: item.unitId })),
      ...pickupPoints
        .filter((item) => item?.coordinates && item?.name)
        .map((item) => ({ ...item, type: 'pickup', coordinates: item.coordinates, label: item.name })),
    ];

    entries.forEach((entry) => {
      const el = document.createElement('button');
      el.type = 'button';
      const selectedId = selectedRef.current?.item?.id ?? selectedRef.current?.id;
      const priorityBand = entry.type === 'rideGroup' ? getPriorityBand(entry.rideGroup?.priorityScore) : null;
      el.className = `map-marker-node map-marker-node-${entry.type}${priorityBand ? ` map-marker-priority-${priorityBand.markerClass}` : ''}${selectedRef.current?.type === entry.type && selectedId === entry.id ? ' is-selected' : ''}`;
      el.innerHTML = entry.type === 'rideGroup'
        ? `<span>${entry.label}</span><strong>${formatPriorityValue(entry.rideGroup?.priorityScore)}</strong>`
        : `<span>${entry.label}</span>`;
      el.setAttribute('aria-label', entry.type === 'rideGroup'
        ? `${entry.label} priority ${formatPriorityValue(entry.rideGroup?.priorityScore)}`
        : entry.label);
      el.addEventListener('click', () => onSelect(entry.type, entry.id));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(entry.coordinates)
        .addTo(map);
      markerRefs.current.push(marker);
    });
  }, [drivers, onSelect, pickupPoints, rideGroups, selectedMapItem]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedMapItem) return;

    let coordinates = null;

    if (selectedMapItem.type === 'rideGroup') {
      coordinates = rideGroups.find((item) => item.id === selectedMapItem.id)?.coordinates ?? null;
    }
    if (selectedMapItem.type === 'driver') {
      coordinates = drivers.find((item) => item.id === selectedMapItem.id)?.coordinates ?? null;
    }
    if (selectedMapItem.type === 'pickup') {
      coordinates = pickupPoints.find((item) => item.id === selectedMapItem.id)?.coordinates ?? null;
    }

    if (!coordinates) return;

    map.flyTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 14),
      essential: true,
      duration: 700,
    });
  }, [drivers, pickupPoints, rideGroups, selectedMapItem]);

  return <div ref={containerRef} className="live-map-canvas" />;
}
