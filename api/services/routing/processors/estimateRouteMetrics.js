import * as turf from '@turf/turf';

const DEFAULT_SPEED_KMH = 32;

export default function estimateRouteMetrics(routeFeature, averageSpeedKmh = DEFAULT_SPEED_KMH) {
  const distanceKm = Number(turf.length(routeFeature, { units: 'kilometers' }).toFixed(2));
  const durationMin = Number(((distanceKm / Math.max(1, averageSpeedKmh)) * 60).toFixed(1));

  return {
    distanceKm,
    durationMin,
  };
}
