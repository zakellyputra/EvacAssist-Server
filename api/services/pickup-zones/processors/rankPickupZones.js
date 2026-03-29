function riskWeight(riskLevel) {
  if (riskLevel === 'red') return 65;
  if (riskLevel === 'orange') return 35;
  if (riskLevel === 'yellow') return 15;
  return 0;
}

export default function rankPickupZones(candidates) {
  const ranked = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
    const walkPenalty = Math.min(35, Math.round(candidate.walkDistanceMeters / 40));
    const proximityPenalty = Math.min(18, (candidate.nearbyZoneCount ?? 0) * 4);
    const score = Math.max(
      0,
      Math.min(100, 100 - riskWeight(candidate.riskLevel) - walkPenalty - proximityPenalty + Math.round((candidate.driverAccessScore ?? 0) * 0.1)),
    );

    return {
      ...candidate,
      score,
      recommended: false,
    };
  }).sort((a, b) => (
    b.score - a.score
    || a.walkDistanceMeters - b.walkDistanceMeters
    || b.driverAccessScore - a.driverAccessScore
  ));

  if (ranked[0]) ranked[0].recommended = true;
  return ranked;
}
