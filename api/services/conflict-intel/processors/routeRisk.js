import * as turf from '@turf/turf';
import ConflictZone from '../models/ConflictZone.js';
import RouteRiskSnapshot from '../models/RouteRiskSnapshot.js';
import {
  bboxToPolygon,
  distanceKmFromPointToCentroid,
  ensureLineString,
  parseBBox,
  pointInsideGeometry,
  toPointFeature,
} from '../utils/geospatial.js';

function summarizeRouteResult(intersectingZones, highestRiskZone) {
  if (!intersectingZones.length) {
    return {
      routeRisk: 'safe',
      score: 0,
      highestRiskLevel: 'green',
      summaryReason: 'No active conflict zones intersect the provided route.',
      recommendedAction: 'allow',
    };
  }

  if (highestRiskZone.riskLevel === 'red') {
    return {
      routeRisk: 'blocked',
      score: highestRiskZone.score,
      highestRiskLevel: highestRiskZone.riskLevel,
      summaryReason: `Route intersects ${intersectingZones.length} active danger zone(s), including at least one red zone.`,
      recommendedAction: 'avoid',
    };
  }

  return {
    routeRisk: 'caution',
    score: highestRiskZone.score,
    highestRiskLevel: highestRiskZone.riskLevel,
    summaryReason: `Route intersects ${intersectingZones.length} active elevated-risk zone(s).`,
    recommendedAction: highestRiskZone.recommendedAction,
  };
}

export async function getActiveZones({ riskLevels = null, bbox = null } = {}) {
  const query = {
    status: { $in: ['active', 'overridden'] },
    activeUntil: { $gt: new Date() },
  };

  if (riskLevels?.length) {
    query.riskLevel = { $in: riskLevels };
  }

  if (bbox) {
    query.geometry = {
      $geoIntersects: {
        $geometry: bboxToPolygon(parseBBox(bbox)),
      },
    };
  }

  return ConflictZone.find(query).sort({ score: -1, confidence: -1 });
}

export async function checkRouteRisk({ route, tripId = null }) {
  const line = ensureLineString(route);
  const zones = await getActiveZones({ riskLevels: ['yellow', 'orange', 'red'] });
  const intersectingZones = zones.filter((zone) => turf.booleanIntersects(line, zone.geometry));
  const highestRiskZone = [...intersectingZones].sort((a, b) => b.score - a.score)[0];
  const result = summarizeRouteResult(intersectingZones, highestRiskZone);

  const snapshot = await RouteRiskSnapshot.create({
    tripId,
    route: line.geometry,
    checkedAt: new Date(),
    result: result.routeRisk,
    score: result.score,
    intersectingZoneIds: intersectingZones.map((zone) => zone.zoneId),
    notes: result.summaryReason,
  });

  return {
    ...result,
    intersectingZones: intersectingZones.map((zone) => ({
      zoneId: zone.zoneId,
      riskLevel: zone.riskLevel,
      score: zone.score,
      recommendedAction: zone.recommendedAction,
    })),
    snapshotId: snapshot._id,
  };
}

export async function checkPointRisk({ lat, lng }) {
  const zones = await getActiveZones();
  const insideZones = zones.filter((zone) => pointInsideGeometry(lng, lat, zone.geometry));
  const nearbyZones = zones
    .map((zone) => ({
      zoneId: zone.zoneId,
      riskLevel: zone.riskLevel,
      score: zone.score,
      distanceKm: Number(distanceKmFromPointToCentroid(lng, lat, zone.centroid).toFixed(2)),
    }))
    .filter((zone) => zone.distanceKm <= 5)
    .sort((a, b) => a.distanceKm - b.distanceKm || b.score - a.score)
    .slice(0, 5);

  const primary = [...insideZones].sort((a, b) => b.score - a.score)[0];

  return {
    insideZone: Boolean(primary),
    riskLevel: primary?.riskLevel ?? (nearbyZones[0]?.riskLevel ?? 'green'),
    score: primary?.score ?? (nearbyZones[0]?.score ?? 0),
    nearbyZones,
  };
}

export function buildGeoJsonZonePayload(zones) {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      geometry: zone.geometry,
      properties: {
        zoneId: zone.zoneId,
        zoneType: zone.zoneType,
        riskLevel: zone.riskLevel,
        score: zone.score,
        confidence: zone.confidence,
        recommendedAction: zone.recommendedAction,
        activeUntil: zone.activeUntil,
      },
    })),
  };
}
