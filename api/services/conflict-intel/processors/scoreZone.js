import { combineConfidence } from '../utils/confidence.js';
import { computeRecencyWeight } from '../utils/timeDecay.js';

function getRiskLevel(score) {
  if (score >= 76) return 'red';
  if (score >= 51) return 'orange';
  if (score >= 26) return 'yellow';
  return 'green';
}

function getRecommendedAction(riskLevel) {
  if (riskLevel === 'red') return 'avoid';
  if (riskLevel === 'orange') return 'reroute_preferred';
  if (riskLevel === 'yellow') return 'caution';
  return 'allow';
}

export default function scoreZone(events) {
  const safeEvents = Array.isArray(events) ? events : [];
  const maxSeverity = Math.max(...safeEvents.map((event) => event.severity), 1);
  const eventCount = safeEvents.length;
  const avgConfidence = combineConfidence(safeEvents.map((event) => event.confidence));
  const sourceCount = new Set(safeEvents.map((event) => event.primarySource)).size;
  const recency = safeEvents.length
    ? safeEvents
      .map((event) => computeRecencyWeight(event.reportedAt, event.expiresAt))
      .reduce((sum, value) => sum + value, 0) / safeEvents.length
    : 0;

  const score = Math.max(0, Math.min(100, Math.round(
    (maxSeverity * 12)
    + Math.min(24, eventCount * 7)
    + (avgConfidence * 28)
    + (Math.min(4, sourceCount) * 5)
    + (recency * 20)
  )));

  const riskLevel = getRiskLevel(score);

  return {
    score,
    confidence: Number(avgConfidence.toFixed(3)),
    riskLevel,
    recommendedAction: getRecommendedAction(riskLevel),
  };
}
