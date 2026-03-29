import * as turf from '@turf/turf';
import { getActiveZones } from '../../conflict-intel/processors/routeRisk.js';

function riskWeight(riskLevel) {
  if (riskLevel === 'red') return 4;
  if (riskLevel === 'orange') return 3;
  if (riskLevel === 'yellow') return 2;
  return 1;
}

export default async function checkRouteRisk(routeFeature) {
  const zones = await getActiveZones();
  const bufferedRoute = turf.buffer(routeFeature, 0.15, { units: 'kilometers' });

  const intersectingZones = [];
  const nearbyZones = [];

  for (const zone of zones) {
    const intersects = turf.booleanIntersects(routeFeature, zone.geometry);
    const nearby = !intersects && turf.booleanIntersects(bufferedRoute, zone.geometry);

    if (intersects) intersectingZones.push(zone);
    else if (nearby) nearbyZones.push(zone);
  }

  const highestRiskZone = [...intersectingZones, ...nearbyZones]
    .sort((a, b) => riskWeight(b.riskLevel) - riskWeight(a.riskLevel) || b.score - a.score)[0] ?? null;

  return {
    intersectingZones,
    nearbyZones,
    highestRiskLevel: highestRiskZone?.riskLevel ?? 'green',
    highestRiskZone,
  };
}
