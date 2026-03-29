import * as turf from '@turf/turf';
import axios from 'axios';
import { isValidCoordinate } from '../../conflict-intel/utils/geospatial.js';

function assertCoordinatePair(value, label) {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`${label} must be [lng, lat]`);
  }

  const [lng, lat] = value;
  if (!isValidCoordinate(lat, lng)) {
    throw new Error(`${label} contains invalid coordinates`);
  }

  return [Number(lng), Number(lat)];
}

async function buildRoadConstrainedLine(routeCoordinates) {
  const baseUrl = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const coordsPath = routeCoordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const osrmUrl = `${baseUrl}/route/v1/driving/${coordsPath}`;

  const response = await axios.get(osrmUrl, {
    params: {
      alternatives: 'false',
      geometries: 'geojson',
      overview: 'full',
      steps: 'false',
    },
    timeout: 8000,
  });

  const route = response?.data?.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    throw new Error('OSRM route geometry unavailable');
  }

  return turf.lineString(route.geometry.coordinates);
}

export default async function buildRoute({ origin, destination, waypoints = [] }) {
  const normalizedOrigin = assertCoordinatePair(origin, 'origin');
  const normalizedDestination = assertCoordinatePair(destination, 'destination');
  const normalizedWaypoints = (Array.isArray(waypoints) ? waypoints : []).map((waypoint, index) => (
    assertCoordinatePair(waypoint, `waypoint[${index}]`)
  ));

  const routeCoordinates = [
    normalizedOrigin,
    ...normalizedWaypoints,
    normalizedDestination,
  ];

  try {
    return await buildRoadConstrainedLine(routeCoordinates);
  } catch {
    // Fallback to straight lines so route generation still works offline or when OSRM is unavailable.
    return turf.lineString(routeCoordinates);
  }
}
