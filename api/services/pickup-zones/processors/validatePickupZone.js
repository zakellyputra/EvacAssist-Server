import * as turf from '@turf/turf';

function riskPenaltyForLevel(riskLevel) {
  if (riskLevel === 'red') return 100;
  if (riskLevel === 'orange') return 45;
  if (riskLevel === 'yellow') return 18;
  return 0;
}

export default function validatePickupZone({ candidate, polygon, activeZones = [] }) {
  const centerPoint = turf.point(candidate.coordinates);
  const intersectingZones = [];
  const nearbyZones = [];
  let rejectedReason = null;
  let highestRiskLevel = 'green';
  let penalty = 0;

  for (const zone of activeZones) {
    const intersects = turf.booleanIntersects(polygon, zone.geometry);
    const nearZone = !intersects && turf.booleanIntersects(
      turf.buffer(centerPoint, 0.12, { units: 'kilometers' }),
      zone.geometry,
    );

    if (intersects) {
      intersectingZones.push(zone);
      if (zone.riskLevel === 'red') rejectedReason = 'inside_red_zone';
      if (zone.riskLevel === 'orange' && !rejectedReason) highestRiskLevel = 'orange';
      if (zone.riskLevel === 'yellow' && highestRiskLevel === 'green') highestRiskLevel = 'yellow';
      penalty += riskPenaltyForLevel(zone.riskLevel);
    } else if (nearZone) {
      nearbyZones.push(zone);
      penalty += Math.round(riskPenaltyForLevel(zone.riskLevel) * 0.4);
      if (zone.riskLevel === 'red' && !rejectedReason) rejectedReason = 'too_close_to_red_zone';
      if (zone.riskLevel === 'orange' && highestRiskLevel === 'green') highestRiskLevel = 'yellow';
    }
  }

  return {
    valid: !rejectedReason,
    rejectedReason,
    riskLevel: rejectedReason === 'inside_red_zone' || rejectedReason === 'too_close_to_red_zone'
      ? 'red'
      : highestRiskLevel,
    penalty: Math.min(100, penalty),
    intersectingZones,
    nearbyZones,
  };
}
