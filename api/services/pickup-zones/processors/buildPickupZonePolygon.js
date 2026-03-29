import * as turf from '@turf/turf';

export default function buildPickupZonePolygon(candidatePoint, radiusMeters = 40) {
  const centerPoint = turf.point(candidatePoint.coordinates);
  const buffered = turf.buffer(centerPoint, radiusMeters / 1000, { units: 'kilometers' });
  return {
    center: {
      type: 'Point',
      coordinates: candidatePoint.coordinates,
    },
    geometry: buffered.geometry,
  };
}
