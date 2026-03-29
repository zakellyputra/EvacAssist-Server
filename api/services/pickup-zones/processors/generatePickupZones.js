import crypto from 'crypto';
import * as turf from '@turf/turf';
import { checkPointRisk, getActiveZones } from '../../conflict-intel/processors/routeRisk.js';
import PickupZone from '../models/PickupZone.js';
import buildPickupZonePolygon from './buildPickupZonePolygon.js';
import generateCandidatePoints from './generateCandidatePoints.js';
import rankPickupZones from './rankPickupZones.js';
import validatePickupZone from './validatePickupZone.js';

function buildPickupZoneId(requestId, coordinates) {
  const digest = crypto.createHash('sha1')
    .update(`${requestId ?? 'anon'}:${coordinates.join(',')}`)
    .digest('hex')
    .slice(0, 10);
  return `pz_${digest}`;
}

export default async function generatePickupZones({
  passengerLocation,
  searchRadiusMeters = 1000,
  requestId = null,
}) {
  const activeZones = await getActiveZones();
  const originalPointRisk = await checkPointRisk({
    lat: passengerLocation[1],
    lng: passengerLocation[0],
  });
  const candidates = generateCandidatePoints(passengerLocation, searchRadiusMeters);

  const evaluated = candidates.map((candidate) => {
    const polygon = buildPickupZonePolygon(candidate);
    const validation = validatePickupZone({ candidate, polygon: polygon.geometry, activeZones });
    const walkDistanceMeters = Math.round(
      turf.distance(turf.point(passengerLocation), turf.point(candidate.coordinates), { units: 'kilometers' }) * 1000
    );

    return {
      pickupZoneId: buildPickupZoneId(requestId, candidate.coordinates),
      requestId,
      passengerLocation: {
        type: 'Point',
        coordinates: passengerLocation,
      },
      center: polygon.center,
      geometry: polygon.geometry,
      riskLevel: validation.riskLevel,
      walkDistanceMeters,
      driverAccessScore: Math.max(20, 100 - Math.round(walkDistanceMeters / 15)),
      basedOnConflictZones: [
        ...validation.intersectingZones.map((zone) => zone.zoneId),
        ...validation.nearbyZones.map((zone) => zone.zoneId),
      ],
      nearbyZoneCount: validation.nearbyZones.length,
      valid: validation.valid,
      rejectedReason: validation.rejectedReason,
    };
  });

  const validCandidates = evaluated.filter((candidate) => candidate.valid);
  if (!validCandidates.length) {
    return {
      originalPointRisk: originalPointRisk.riskLevel,
      recommendedPickupZone: null,
      alternatives: [],
      reason: 'No safe pickup zones could be generated within the provided search radius.',
    };
  }

  const ranked = rankPickupZones(validCandidates);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  for (const candidate of ranked) {
    await PickupZone.findOneAndUpdate(
      { pickupZoneId: candidate.pickupZoneId },
      {
        $set: {
          pickupZoneId: candidate.pickupZoneId,
          requestId: candidate.requestId,
          passengerLocation: candidate.passengerLocation,
          center: candidate.center,
          geometry: candidate.geometry,
          riskLevel: candidate.riskLevel,
          score: candidate.score,
          walkDistanceMeters: candidate.walkDistanceMeters,
          driverAccessScore: candidate.driverAccessScore,
          recommended: candidate.recommended,
          basedOnConflictZones: candidate.basedOnConflictZones,
          expiresAt,
          metadata: {
            nearbyZoneCount: candidate.nearbyZoneCount,
          },
        },
      },
      { upsert: true, new: true }
    );
  }

  return {
    originalPointRisk: originalPointRisk.riskLevel,
    recommendedPickupZone: ranked[0],
    alternatives: ranked.slice(1, 5),
    reason: ranked[0].riskLevel === 'green'
      ? 'Safe pickup zone found.'
      : 'Closest viable pickup zones still carry some residual risk and should be monitored.',
  };
}
