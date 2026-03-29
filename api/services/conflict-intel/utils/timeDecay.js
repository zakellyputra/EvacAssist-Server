const SEVERITY_EXPIRY_HOURS = {
  5: 48,
  4: 24,
  3: 12,
  2: 6,
  1: 3,
};

export function getExpiryHoursForSeverity(severity) {
  return SEVERITY_EXPIRY_HOURS[Math.max(1, Math.min(5, Number(severity) || 1))] ?? 6;
}

export function computeExpiresAt(reportedAt, severity) {
  const baseDate = reportedAt ? new Date(reportedAt) : new Date();
  const expiresAt = new Date(baseDate);
  expiresAt.setHours(expiresAt.getHours() + getExpiryHoursForSeverity(severity));
  return expiresAt;
}

export function computeRecencyWeight(reportedAt, expiresAt) {
  const reportedMs = new Date(reportedAt).getTime();
  const expiresMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();

  if (!Number.isFinite(reportedMs) || !Number.isFinite(expiresMs) || expiresMs <= reportedMs) {
    return 0.5;
  }

  const progress = Math.max(0, Math.min(1, (nowMs - reportedMs) / (expiresMs - reportedMs)));
  return Number((1 - progress).toFixed(3));
}
