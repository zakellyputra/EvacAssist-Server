import * as turf from '@turf/turf';
import { isValidCoordinate } from '../../conflict-intel/utils/geospatial.js';

const DEFAULT_DISTANCES = [0, 100, 250, 500, 750, 1000];
const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function generateCandidatePoints(passengerLocation, searchRadiusMeters = 1000) {
  if (!Array.isArray(passengerLocation) || passengerLocation.length !== 2) {
    throw new Error('passengerLocation must be [lng, lat]');
  }

  const [lng, lat] = passengerLocation;
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('passengerLocation contains invalid coordinates');
  }

  const origin = turf.point([lng, lat]);
  const candidateMap = new Map();

  for (const distanceMeters of DEFAULT_DISTANCES.filter((distance) => distance <= searchRadiusMeters)) {
    if (distanceMeters === 0) {
      candidateMap.set('origin', {
        id: 'origin',
        coordinates: [lng, lat],
        distanceMeters: 0,
        bearing: null,
      });
      continue;
    }

    for (const bearing of BEARINGS) {
      const destination = turf.destination(origin, distanceMeters / 1000, bearing, { units: 'kilometers' });
      const key = `${distanceMeters}-${bearing}`;
      candidateMap.set(key, {
        id: key,
        coordinates: destination.geometry.coordinates,
        distanceMeters,
        bearing,
      });
    }
  }

  return [...candidateMap.values()];
}
