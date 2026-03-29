import { getSourceTrust } from './eventMapping.js';

export function baseConfidenceForSource(source, severity) {
  const trust = getSourceTrust(source);
  const severityLift = (Math.max(1, Math.min(5, Number(severity) || 1)) - 1) * 0.03;
  return Math.max(0.2, Math.min(0.98, trust + severityLift));
}

export function boostConfidenceForVerification(confidence, verificationCount, sourceCount = 1) {
  const verifiedLift = Math.min(0.2, Math.max(0, verificationCount - 1) * 0.05);
  const sourceLift = Math.min(0.15, Math.max(0, sourceCount - 1) * 0.04);
  return Math.max(0, Math.min(0.99, Number(confidence || 0) + verifiedLift + sourceLift));
}

export function combineConfidence(values) {
  const valid = (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(3));
}
