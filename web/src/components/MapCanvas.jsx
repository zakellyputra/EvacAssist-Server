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

function geometryBounds(geometry) {
  const coordinates = geometry?.type === 'Polygon'
    ? geometry.coordinates.flat(1)
    : geometry?.type === 'MultiPolygon'
      ? geometry.coordinates.flat(2)
      : [];
  if (!coordinates.length) return null;
  const lngs = coordinates.map(([lng]) => Number(lng));
  const lats = coordinates.map(([, lat]) => Number(lat));
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function geometryCenter(geometry) {
  const bounds = geometryBounds(geometry);
  if (!bounds) return null;
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
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
  const conflictZones = Array.isArray(data?.conflictZones) ? data.conflictZones : [];
  const conflictCountries = Array.isArray(data?.conflictCountries) ? data.conflictCountries : [];
  const alertAreas = Array.isArray(data?.alertAreas) ? data.alertAreas : [];

  const zoneCollection = useMemo(() => buildFeatureCollection(zones), [zones]);
  const conflictZoneCollection = useMemo(() => buildFeatureCollection(conflictZones), [conflictZones]);
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

      if (map.getSource('ops-conflict-zones')) {
        map.getSource('ops-conflict-zones').setData(conflictZoneCollection);
      } else {
        map.addSource('ops-conflict-zones', { type: 'geojson', data: conflictZoneCollection });
        map.addLayer({
          id: 'ops-conflict-zones-fill',
          type: 'fill',
          source: 'ops-conflict-zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'riskLevel'],
              'red', '#9f1d1d',
              'orange', '#cc6d1f',
              'yellow', '#b38a1d',
              '#72726c',
            ],
            'fill-opacity': 0.16,
          },
        });
        map.addLayer({
          id: 'ops-conflict-zones-line',
          type: 'line',
          source: 'ops-conflict-zones',
          paint: {
            'line-color': [
              'match',
              ['get', 'riskLevel'],
              'red', '#7e1717',
              'orange', '#9e5316',
              'yellow', '#8b6a12',
              '#555550',
            ],
            'line-width': 2,
          },
        });
      }

      const handleZoneClick = (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id;
        if (id) onSelect('zone', id);
      };
      const handleConflictZoneClick = (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id;
        if (id) onSelect('conflictZone', id);
      };
      const handleAlertClick = (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id;
        if (id) onSelect('alertArea', id);
      };

      map.on('click', 'ops-zones-fill', handleZoneClick);
      map.on('click', 'ops-conflict-zones-fill', handleConflictZoneClick);
      map.on('click', 'ops-alert-areas-line', handleAlertClick);

      cleanup = () => {
        if (isDisposed) return;
        if (!mapRef.current || mapRef.current !== map) return;

        try {
          if (map.getLayer('ops-zones-fill')) map.off('click', 'ops-zones-fill', handleZoneClick);
        } catch {}
        try {
          if (map.getLayer('ops-conflict-zones-fill')) map.off('click', 'ops-conflict-zones-fill', handleConflictZoneClick);
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
  }, [alertCollection, conflictZoneCollection, onSelect, zoneCollection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (Array.isArray(data?.bounds) && data.bounds.length === 2) {
      map.fitBounds(data.bounds, {
        padding: 48,
        maxZoom: 7,
        duration: 0,
      });
      return;
    }

    if (Array.isArray(data?.center)) {
      map.jumpTo({
        center: data.center,
        zoom: data?.zoom ?? map.getZoom(),
      });
    }
  }, [data?.bounds, data?.center, data?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const entries = [
      ...conflictCountries
        .filter((item) => item?.center && item?.id)
        .map((item) => ({ ...item, type: 'conflictCountry', coordinates: item.center, label: item.country })),
      ...conflictZones
        .filter((item) => item?.id)
        .map((item) => ({
          ...item,
          type: 'conflictZone',
          coordinates: item.centroid?.coordinates ?? geometryCenter(item.geometry?.geometry ?? item.geometry),
          label: item.zoneId ?? 'Conflict',
        }))
        .filter((item) => item.coordinates),
      ...rideGroups
        .filter((item) => item?.coordinates && item?.rideGroup?.id)
        .map((item) => ({ ...item, type: 'rideGroup', coordinates: item.coordinates, label: item.rideGroup.id })),
      ...drivers
        .filter((item) => item?.coordinates && item?.unitId)
        .map((item) => ({ ...item, type: 'driver', coordinates: item.coordinates, label: item.unitId })),
      ...pickupPoints
        .filter((item) => item?.coordinates && item?.name)
        .map((item) => ({ ...item, type: 'pickup', coordinates: item.coordinates, label: item.name })),
      ...zones
        .filter((item) => item?.id)
        .map((item) => ({
          ...item,
          type: 'zone',
          coordinates: geometryCenter(item.geometry?.geometry ?? item.geometry),
          label: item.name ?? 'Zone',
        }))
        .filter((item) => item.coordinates),
      ...alertAreas
        .filter((item) => item?.id)
        .map((item) => ({
          ...item,
          type: 'alertArea',
          coordinates: geometryCenter(item.geometry?.geometry ?? item.geometry),
          label: item.alert?.title ?? item.name ?? 'Alert',
        }))
        .filter((item) => item.coordinates),
    ];

    entries.forEach((entry) => {
      const el = document.createElement('button');
      el.type = 'button';
      const selectedId = selectedRef.current?.item?.id ?? selectedRef.current?.id;
      const priorityBand = entry.type === 'rideGroup' ? getPriorityBand(entry.rideGroup?.priorityScore) : null;
      el.className = `map-marker-node map-marker-node-${entry.type}${priorityBand ? ` map-marker-priority-${priorityBand.markerClass}` : ''}${selectedRef.current?.type === entry.type && selectedId === entry.id ? ' is-selected' : ''}`;
      const icon = entry.type === 'rideGroup'
        ? 'RG'
        : entry.type === 'driver'
          ? 'DR'
          : entry.type === 'pickup'
            ? 'PU'
            : entry.type === 'zone'
              ? 'ZN'
              : entry.type === 'alertArea'
                ? 'AL'
                : entry.type === 'conflictZone'
                  ? 'CZ'
                  : 'CT';
      const secondary = entry.type === 'rideGroup'
        ? formatPriorityValue(entry.rideGroup?.priorityScore)
        : entry.type === 'conflictCountry'
          ? `${entry.zoneCount} zones`
          : null;
      el.innerHTML = secondary
        ? `<em>${icon}</em><span>${entry.label}</span><strong>${secondary}</strong>`
        : `<em>${icon}</em><span>${entry.label}</span>`;
      el.setAttribute('aria-label', entry.type === 'rideGroup'
        ? `${entry.label} priority ${formatPriorityValue(entry.rideGroup?.priorityScore)}`
        : entry.type === 'conflictCountry'
          ? `${entry.label} ${entry.zoneCount} conflict zones`
          : entry.label);
      el.addEventListener('click', () => onSelect(entry.type, entry.id));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(entry.coordinates)
        .addTo(map);
      markerRefs.current.push(marker);
    });
  }, [conflictCountries, drivers, onSelect, pickupPoints, rideGroups, selectedMapItem]);

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
    if (selectedMapItem.type === 'zone') {
      const zone = zones.find((item) => item.id === selectedMapItem.id);
      const bounds = geometryBounds(zone?.geometry?.geometry ?? zone?.geometry);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 52,
          maxZoom: 11,
          essential: true,
          duration: 700,
        });
        return;
      }
      coordinates = geometryCenter(zone?.geometry?.geometry ?? zone?.geometry);
    }
    if (selectedMapItem.type === 'conflictZone') {
      const zone = conflictZones.find((item) => item.id === selectedMapItem.id);
      const bounds = geometryBounds(zone?.geometry?.geometry ?? zone?.geometry);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 52,
          maxZoom: 8,
          essential: true,
          duration: 700,
        });
        return;
      }
      coordinates = zone?.centroid?.coordinates ?? null;
    }
    if (selectedMapItem.type === 'conflictCountry') {
      const country = conflictCountries.find((item) => item.id === selectedMapItem.id);
      if (country?.bounds) {
        map.fitBounds(country.bounds, {
          padding: 64,
          maxZoom: 6,
          essential: true,
          duration: 700,
        });
        return;
      }
      coordinates = country?.center ?? null;
    }
    if (selectedMapItem.type === 'alertArea') {
      const alertArea = alertAreas.find((item) => item.id === selectedMapItem.id);
      const bounds = geometryBounds(alertArea?.geometry?.geometry ?? alertArea?.geometry);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 52,
          maxZoom: 11,
          essential: true,
          duration: 700,
        });
        return;
      }
      coordinates = geometryCenter(alertArea?.geometry?.geometry ?? alertArea?.geometry);
    }

    if (!coordinates) return;

    map.flyTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 14),
      essential: true,
      duration: 700,
    });
  }, [alertAreas, conflictCountries, conflictZones, drivers, pickupPoints, rideGroups, selectedMapItem, zones]);

  return <div ref={containerRef} className="live-map-canvas" />;
}
