const CONFLICT_TYPE_META = {
  DRIVER_DOUBLE_BOOKED: {
    label: 'Driver double-booked',
    shortLabel: 'Driver conflict',
    category: 'assignment',
  },
  VEHICLE_DOUBLE_BOOKED: {
    label: 'Vehicle double-booked',
    shortLabel: 'Vehicle conflict',
    category: 'assignment',
  },
  RIDE_OVER_CAPACITY: {
    label: 'Ride over capacity',
    shortLabel: 'Over capacity',
    category: 'capacity',
  },
  RIDE_FULL: {
    label: 'Ride full',
    shortLabel: 'Ride full',
    category: 'capacity',
  },
  READINESS_BLOCKED: {
    label: 'Readiness blocked',
    shortLabel: 'Blocked',
    category: 'readiness',
  },
  CRITICAL_ALERT_ACTIVE: {
    label: 'Critical unresolved alert',
    shortLabel: 'Critical alert',
    category: 'alert',
  },
  DISPATCH_STATE_INVALID: {
    label: 'Invalid dispatch state',
    shortLabel: 'Dispatch invalid',
    category: 'dispatch',
  },
};

const SEVERITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function titleCaseWords(value) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatUnknownConflictLabel(type) {
  if (!type) return 'Unknown conflict type';
  return titleCaseWords(type);
}

function buildRelatedEntitySummary(conflict) {
  const refs = [];
  if (conflict.driverId) refs.push(`Driver ${conflict.driverId}`);
  if (conflict.vehicleId) refs.push(`Vehicle ${conflict.vehicleId}`);
  if (conflict.requestId) refs.push(`Request ${conflict.requestId}`);
  if (conflict.alertId) refs.push(`Alert ${conflict.alertId}`);
  return refs.join(' · ');
}

export function getConflictSeverityRank(severity) {
  return SEVERITY_RANK[String(severity ?? '').toLowerCase()] ?? 0;
}

export function getConflictSeverityTone(severity) {
  const normalized = String(severity ?? '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'strong';
  if (normalized === 'medium') return 'muted';
  return 'default';
}

export function getConflictTypeMeta(type) {
  return CONFLICT_TYPE_META[type] ?? {
    label: formatUnknownConflictLabel(type),
    shortLabel: formatUnknownConflictLabel(type),
    category: 'unknown',
  };
}

export function isAssignmentConflictType(type) {
  return getConflictTypeMeta(type).category === 'assignment';
}

export function normalizeConflict(rawConflict) {
  if (!rawConflict || typeof rawConflict !== 'object') return null;

  const id = rawConflict._id ?? rawConflict.id ?? `${rawConflict.tripId ?? 'unknown'}-${rawConflict.type ?? 'conflict'}`;
  const type = rawConflict.type ?? null;
  const severity = String(rawConflict.severity ?? 'low').toLowerCase();
  const meta = getConflictTypeMeta(type);

  const normalized = {
    id,
    type,
    label: meta.label,
    shortLabel: meta.shortLabel,
    category: meta.category,
    severity,
    severityRank: getConflictSeverityRank(severity),
    severityTone: getConflictSeverityTone(severity),
    status: rawConflict.status ?? 'active',
    blocking: Boolean(rawConflict.blocking),
    tripId: rawConflict.tripId ?? rawConflict.trip_id ?? null,
    requestId: rawConflict.requestId ?? rawConflict.request_id ?? null,
    driverId: rawConflict.driverId ?? rawConflict.driver_id ?? null,
    vehicleId: rawConflict.vehicleId ?? rawConflict.vehicle_id ?? null,
    alertId: rawConflict.alertId ?? rawConflict.alert_id ?? null,
    message: rawConflict.message ?? meta.label,
    details: rawConflict.details ?? '',
    detectedAt: rawConflict.detectedAt ?? rawConflict.detected_at ?? rawConflict.createdAt ?? null,
  };

  return {
    ...normalized,
    relatedEntitySummary: buildRelatedEntitySummary(normalized),
  };
}

export function sortConflictsByUrgency(a, b) {
  return Number(Boolean(b?.blocking)) - Number(Boolean(a?.blocking))
    || getConflictSeverityRank(b?.severity) - getConflictSeverityRank(a?.severity)
    || new Date(b?.detectedAt ?? 0) - new Date(a?.detectedAt ?? 0)
    || String(a?.label ?? '').localeCompare(String(b?.label ?? ''));
}

export function groupConflictsByTrip(conflicts) {
  const grouped = new Map();
  (Array.isArray(conflicts) ? conflicts : [])
    .map(normalizeConflict)
    .filter(Boolean)
    .filter((conflict) => conflict.status === 'active' && conflict.tripId)
    .sort(sortConflictsByUrgency)
    .forEach((conflict) => {
      const tripKey = String(conflict.tripId);
      const existing = grouped.get(tripKey) ?? [];
      grouped.set(tripKey, [...existing, conflict]);
    });
  return grouped;
}

export function getHighestConflictSeverity(conflicts) {
  const activeConflicts = Array.isArray(conflicts) ? conflicts : [];
  if (!activeConflicts.length) return null;
  return [...activeConflicts].sort(sortConflictsByUrgency)[0]?.severity ?? null;
}

export function formatConflictCount(count) {
  if (!count) return 'No active conflicts';
  if (count === 1) return '1 conflict';
  return `${count} conflicts`;
}
