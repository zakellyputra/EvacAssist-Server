import * as turf from '@turf/turf';
import { getActiveZones } from '../../conflict-intel/processors/routeRisk.js';

function riskWeight(riskLevel) {
  if (riskLevel === 'red') return 4;
  if (riskLevel === 'orange') return 3;
  if (riskLevel === 'yellow') return 2;
  return 1;
}

function estimateConflictExposure(routeFeature, zones) {
  const routeLengthKm = turf.length(routeFeature, { units: 'kilometers' });
  if (!routeLengthKm || !zones.length) {
    return { conflictExposureKm: 0, weightedExposureKm: 0 };
  }

  const stepKm = 0.15;
  const samples = Math.max(1, Math.ceil(routeLengthKm / stepKm));
  let weightedExposureKm = 0;
  let conflictExposureKm = 0;

  for (let i = 0; i <= samples; i += 1) {
    const distanceAlong = Math.min(routeLengthKm, i * stepKm);
    const point = turf.along(routeFeature, distanceAlong, { units: 'kilometers' });
    const containingZones = zones.filter((zone) => turf.booleanPointInPolygon(point, zone.geometry));
    if (!containingZones.length) continue;

    const dominantZone = containingZones.sort((a, b) => riskWeight(b.riskLevel) - riskWeight(a.riskLevel))[0];
    conflictExposureKm += stepKm;
    weightedExposureKm += stepKm * riskWeight(dominantZone.riskLevel);
  }

  return {
    conflictExposureKm: Number(Math.min(routeLengthKm, conflictExposureKm).toFixed(2)),
    weightedExposureKm: Number(weightedExposureKm.toFixed(2)),
  };
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

  const { conflictExposureKm, weightedExposureKm } = estimateConflictExposure(routeFeature, intersectingZones);

  return {
    intersectingZones,
    nearbyZones,
    highestRiskLevel: highestRiskZone?.riskLevel ?? 'green',
    highestRiskZone,
    conflictExposureKm,
    weightedExposureKm,
  };
}
