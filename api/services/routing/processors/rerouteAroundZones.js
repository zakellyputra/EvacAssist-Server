import * as turf from '@turf/turf';
import buildRoute from './buildRoute.js';
import checkRouteRisk from './checkRouteRisk.js';
import estimateRouteMetrics from './estimateRouteMetrics.js';
import scoreRoute from './scoreRoute.js';

function sortZonesForDetour(zones) {
  return [...zones].sort((a, b) => b.score - a.score);
}

function buildDetourWaypoints(zone, origin, destination) {
  const centroid = turf.point(zone.centroid.coordinates);
  const zoneExtentKm = Math.max(1.5, Number(zone.score || 0) / 25);
  const bearings = [35, -35, 65, -65, 115, -115];

  return bearings.map((bearing) => (
    turf.destination(centroid, zoneExtentKm + 0.8, bearing, { units: 'kilometers' }).geometry.coordinates
  )).filter((waypoint) => Array.isArray(waypoint) && waypoint.length === 2);
}

export default async function rerouteAroundZones({ origin, destination, directRouteRisk }) {
  const blockingZones = sortZonesForDetour(
    [...(directRouteRisk.intersectingZones ?? []), ...(directRouteRisk.nearbyZones ?? [])]
      .filter((zone) => ['red', 'orange'].includes(zone.riskLevel))
  ).slice(0, 2);

  if (!blockingZones.length) {
    return {
      foundAlternative: false,
      routeRisk: 'safe',
      score: 0,
      recommendedAction: 'allow',
      explanation: 'Direct route does not require rerouting.',
    };
  }

  const candidates = [];

  for (const zone of blockingZones) {
    const waypoints = buildDetourWaypoints(zone, origin, destination);
    for (const waypoint of waypoints) {
      const geometry = await buildRoute({ origin, destination, waypoints: [waypoint] });
      const risk = await checkRouteRisk(geometry);
      const scoring = scoreRoute(risk);
      const metrics = estimateRouteMetrics(geometry);

      candidates.push({
        geometry,
        waypoints: [waypoint],
        ...risk,
        ...scoring,
        ...metrics,
      });
    }
  }

  const best = candidates.sort((a, b) => (
    (a.conflictExposureKm ?? Number.MAX_SAFE_INTEGER) - (b.conflictExposureKm ?? Number.MAX_SAFE_INTEGER)
    || a.score - b.score
    || Number(a.routeRisk === 'blocked') - Number(b.routeRisk === 'blocked')
    || a.durationMin - b.durationMin
    || a.distanceKm - b.distanceKm
  ))[0];

  if (!best) {
    return {
      foundAlternative: false,
      routeRisk: 'blocked',
      score: 100,
      recommendedAction: 'avoid',
      explanation: 'No reroute candidates could be generated around the active conflict zones.',
    };
  }

  return {
    foundAlternative: best.routeRisk !== 'blocked' || best.score < (directRouteRisk.highestRiskZone?.score ?? 100),
    ...best,
    explanation: best.routeRisk === 'blocked'
      ? 'All reroute candidates still intersect unacceptable conflict zones.'
      : 'Alternative route generated around elevated-risk conflict zones.',
  };
}
