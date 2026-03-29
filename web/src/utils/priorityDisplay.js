export function getPriorityBand(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return { label: 'Unavailable', tone: 'muted', markerClass: 'unknown', shortLabel: 'N/A' };
  }

  if (score >= 75) return { label: 'Critical', tone: 'strong', markerClass: 'critical', shortLabel: 'Critical' };
  if (score >= 50) return { label: 'High', tone: 'strong', markerClass: 'high', shortLabel: 'High' };
  if (score >= 25) return { label: 'Medium', tone: 'muted', markerClass: 'medium', shortLabel: 'Medium' };
  return { label: 'Low', tone: 'default', markerClass: 'low', shortLabel: 'Low' };
}

export function formatPriorityValue(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'Priority unavailable';
  return String(score);
}

export function hasActiveUnresolvedAlerts(rideGroup) {
  return Array.isArray(rideGroup?.linkedAlerts)
    ? rideGroup.linkedAlerts.some((alert) => alert.status !== 'Resolved')
    : false;
}

