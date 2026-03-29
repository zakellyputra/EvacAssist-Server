const CATEGORY_MAPPING = {
  acled: {
    airstrike: { category: 'airstrike', severity: 5, tags: ['kinetic', 'verified_conflict'] },
    explosion: { category: 'explosion', severity: 5, tags: ['kinetic'] },
    armed_clash: { category: 'armed_conflict', severity: 4, tags: ['combat'] },
    shelling: { category: 'armed_conflict', severity: 4, tags: ['indirect_fire'] },
    blockade: { category: 'blockade', severity: 4, tags: ['movement_restriction'] },
    unrest: { category: 'unrest', severity: 2, tags: ['civil_unrest'] },
    protest: { category: 'unrest', severity: 2, tags: ['civil_unrest'] },
    infrastructure_damage: { category: 'infrastructure_damage', severity: 3, tags: ['infrastructure'] },
  },
  reliefweb: {
    security: { category: 'armed_conflict', severity: 4, tags: ['humanitarian_signal'] },
    flood: { category: 'unknown_hazard', severity: 3, tags: ['weather_hazard'] },
    fire: { category: 'fire', severity: 3, tags: ['humanitarian_signal'] },
    displacement: { category: 'military_activity', severity: 2, tags: ['population_movement'] },
    access: { category: 'blockade', severity: 3, tags: ['humanitarian_access'] },
  },
  firms: {
    wildfire: { category: 'fire', severity: 3, tags: ['thermal_anomaly'] },
    fire: { category: 'fire', severity: 3, tags: ['thermal_anomaly'] },
  },
  liveuamap: {
    strike: { category: 'airstrike', severity: 5, tags: ['live_feed'] },
    explosion: { category: 'explosion', severity: 5, tags: ['live_feed'] },
    military: { category: 'military_activity', severity: 3, tags: ['live_feed'] },
    blockade: { category: 'blockade', severity: 4, tags: ['live_feed'] },
  },
};

const SOURCE_TRUST = {
  acled: 0.88,
  reliefweb: 0.74,
  firms: 0.82,
  liveuamap: 0.58,
  unknown: 0.45,
};

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function mapSourceEventType(source, eventType, eventSubType) {
  const sourceKey = normalizeKey(source);
  const typeKey = normalizeKey(eventSubType) || normalizeKey(eventType);
  const sourceMap = CATEGORY_MAPPING[sourceKey] ?? {};
  const mapped = sourceMap[typeKey];

  if (mapped) {
    return {
      category: mapped.category,
      subcategory: typeKey || 'unspecified',
      severity: mapped.severity,
      tags: mapped.tags,
    };
  }

  return {
    category: 'unknown_hazard',
    subcategory: typeKey || 'unspecified',
    severity: 1,
    tags: ['unclassified'],
  };
}

export function getSourceTrust(source) {
  return SOURCE_TRUST[normalizeKey(source)] ?? SOURCE_TRUST.unknown;
}

export function mapZoneType(category) {
  if (category === 'fire') return 'fire_area';
  if (category === 'blockade') return 'blockade_area';
  if (category === 'unknown_hazard' || category === 'unrest') return 'uncertainty_area';
  if (category === 'armed_conflict' || category === 'airstrike' || category === 'explosion') return 'hotspot';
  return 'corridor_risk';
}
