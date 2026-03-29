const FALLBACK_CONFIG = { label: 'Unknown', tone: 'default' };

const MAPS = {
  requestStatus: {
    pending: { label: 'Pending', tone: 'warning' },
    reviewing: { label: 'Reviewing', tone: 'info' },
    approved: { label: 'Approved', tone: 'info' },
    assigned: { label: 'Assigned', tone: 'accent' },
    en_route: { label: 'En Route', tone: 'accent' },
    picked_up: { label: 'Picked Up', tone: 'accent' },
    completed: { label: 'Completed', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'muted' },
    failed: { label: 'Failed', tone: 'danger' },
  },
  requestPriority: {
    low: { label: 'Low', tone: 'success' },
    medium: { label: 'Medium', tone: 'info' },
    high: { label: 'High', tone: 'warning' },
    critical: { label: 'Critical', tone: 'danger' },
  },
  tripStatus: {
    pending: { label: 'Pending', tone: 'warning' },
    accepted: { label: 'Accepted', tone: 'info' },
    in_progress: { label: 'In Progress', tone: 'accent' },
    completed: { label: 'Completed', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'muted' },
    failed: { label: 'Failed', tone: 'danger' },
  },
  incidentSeverity: {
    low: { label: 'Low', tone: 'success' },
    medium: { label: 'Medium', tone: 'info' },
    moderate: { label: 'Moderate', tone: 'info' },
    high: { label: 'High', tone: 'warning' },
    critical: { label: 'Critical', tone: 'danger' },
  },
  incidentActivity: {
    active: { label: 'Active', tone: 'danger' },
    resolved: { label: 'Resolved', tone: 'muted' },
  },
  zoneStatus: {
    safe: { label: 'Safe', tone: 'success' },
    warning: { label: 'Warning', tone: 'warning' },
    danger: { label: 'Danger', tone: 'danger' },
    blocked: { label: 'Blocked', tone: 'danger' },
    evacuated: { label: 'Evacuated', tone: 'muted' },
  },
};

export function getStatusConfig(category, value) {
  const map = MAPS[category];
  if (!map) return FALLBACK_CONFIG;
  return map[String(value)] ?? { label: String(value ?? FALLBACK_CONFIG.label), tone: FALLBACK_CONFIG.tone };
}
