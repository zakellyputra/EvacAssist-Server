// Trip lifecycle statuses
export const TRIP_STATUS = {
  PENDING:     'pending',
  ACCEPTED:    'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
};

// Incident event types
export const EVENT_TYPES = [
  'armed_clash',
  'infrastructure_damage',
  'fire',
  'flood',
  'road_block',
  'crowd',
  'checkpoint',
  'unknown',
];

// Risk component weights — must sum to 1.0
export const RISK_WEIGHTS = {
  conflict:    0.35,
  blockage:    0.25,
  infra:       0.20,
  crowd:       0.10,
  weather:     0.05,
  uncertainty: 0.05,
};

// Hard block threshold: effective severity above this → edge cost = Infinity
export const HARD_BLOCK_THRESHOLD = 0.85;

// Source reliability weights
export const SOURCE_WEIGHTS = {
  anonymous:      0.30,
  user_report:    0.50,
  ngo_alert:      0.80,
  operator:       0.90,
  image_confirmed: 0.95,
};

// Freshness decay constant: e^(-DECAY_LAMBDA * hours)
// At λ=0.1, a 7-hour-old report has ~50% freshness
export const DECAY_LAMBDA = 0.1;
