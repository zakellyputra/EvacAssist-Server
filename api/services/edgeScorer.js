// Risk component weights — must sum to 1.0
const WEIGHTS = {
  conflict:    0.35,
  blockage:    0.25,
  infra:       0.20,
  crowd:       0.10,
  weather:     0.05,
  uncertainty: 0.05,
};

const HARD_BLOCK_THRESHOLD = 0.85;

/**
 * Exponential time-decay: halves roughly every 7 hours.
 * @param {Date} lastUpdatedAt
 */
export function computeFreshness(lastUpdatedAt) {
  const hoursAgo = (Date.now() - new Date(lastUpdatedAt).getTime()) / 3_600_000;
  return Math.exp(-0.1 * hoursAgo);
}

/**
 * Effective risk contribution from a single incident component.
 */
export function effectiveRisk(severity, confidence, freshness, sourceWeight) {
  return severity * confidence * freshness * sourceWeight;
}

/**
 * Compute the final traversal cost for a road segment.
 *
 * @param {number} baseTime - Raw travel time in seconds (base_cost from RoadSegment)
 * @param {object} risk - EdgeRisk document fields
 * @param {Date} riskUpdatedAt - When the EdgeRisk was last updated (for freshness)
 * @returns {{ cost: number, isHardBlocked: boolean, multiplier: number }}
 */
export function scoreEdge(baseTime, risk, riskUpdatedAt) {
  const freshness = computeFreshness(riskUpdatedAt ?? new Date());

  // Check any single component for hard block
  const components = {
    conflict:    risk.conflict_risk  ?? 0,
    blockage:    risk.blockage_risk  ?? 0,
    infra:       risk.infra_risk     ?? 0,
    crowd:       risk.crowd_risk     ?? 0,
    weather:     risk.weather_risk   ?? 0,
    uncertainty: risk.uncertainty    ?? 0,
  };

  // Hard block from model flag OR any raw component exceeding threshold
  const hardBlockFromField = risk.is_hard_blocked === true;
  const hardBlockFromThreshold = Object.values(components).some(
    (v) => effectiveRisk(v, risk.confidence ?? 1, freshness, 1) > HARD_BLOCK_THRESHOLD
  );

  if (hardBlockFromField || hardBlockFromThreshold) {
    return { cost: Infinity, isHardBlocked: true, multiplier: Infinity };
  }

  const multiplier =
    WEIGHTS.conflict    * components.conflict    +
    WEIGHTS.blockage    * components.blockage    +
    WEIGHTS.infra       * components.infra       +
    WEIGHTS.crowd       * components.crowd       +
    WEIGHTS.weather     * components.weather     +
    WEIGHTS.uncertainty * components.uncertainty;

  // Apply confidence and freshness to the total multiplier
  const adjustedMultiplier = multiplier * (risk.confidence ?? 1) * freshness;

  return {
    cost: baseTime * (1 + adjustedMultiplier),
    isHardBlocked: false,
    multiplier: adjustedMultiplier,
  };
}
