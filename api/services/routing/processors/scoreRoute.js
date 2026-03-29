function riskWeight(riskLevel) {
  if (riskLevel === 'red') return 4;
  if (riskLevel === 'orange') return 3;
  if (riskLevel === 'yellow') return 2;
  return 1;
}

export default function scoreRoute({
  intersectingZones = [],
  nearbyZones = [],
  highestRiskLevel = 'green',
  conflictExposureKm = 0,
  weightedExposureKm = 0,
}) {
  const intersectsRed = intersectingZones.some((zone) => zone.riskLevel === 'red');
  const intersectsOrange = intersectingZones.some((zone) => zone.riskLevel === 'orange');
  const intersectsYellow = intersectingZones.some((zone) => zone.riskLevel === 'yellow');
  const nearRedOrOrange = nearbyZones.some((zone) => ['red', 'orange'].includes(zone.riskLevel));

  const base = riskWeight(highestRiskLevel) * 18;
  const intersectionPenalty = intersectingZones.length * 12;
  const nearbyPenalty = nearbyZones.length * 5;
  const exposurePenalty = Math.round((conflictExposureKm * 10) + (weightedExposureKm * 5));
  const score = Math.max(0, Math.min(100, Math.round(base + intersectionPenalty + nearbyPenalty + exposurePenalty)));

  if (intersectsRed) {
    return {
      routeRisk: 'blocked',
      score: Math.max(76, score),
      recommendedAction: 'avoid',
      explanation: 'Route intersects one or more red conflict zones.',
    };
  }

  if (intersectsOrange || intersectsYellow || nearRedOrOrange) {
    return {
      routeRisk: 'caution',
      score: Math.max(26, score),
      recommendedAction: 'reroute_preferred',
      explanation: 'Route intersects or passes near elevated-risk conflict zones.',
    };
  }

  return {
    routeRisk: 'safe',
    score: Math.min(25, score),
    recommendedAction: 'allow',
    explanation: 'Route avoids all active elevated-risk conflict zones.',
  };
}
