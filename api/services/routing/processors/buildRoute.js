import * as turf from '@turf/turf';
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

export default function buildRoute({ origin, destination, waypoints = [] }) {
  const normalizedOrigin = assertCoordinatePair(origin, 'origin');
  const normalizedDestination = assertCoordinatePair(destination, 'destination');
  const normalizedWaypoints = (Array.isArray(waypoints) ? waypoints : []).map((waypoint, index) => (
    assertCoordinatePair(waypoint, `waypoint[${index}]`)
  ));

  return turf.lineString([
    normalizedOrigin,
    ...normalizedWaypoints,
    normalizedDestination,
  ]);
}
