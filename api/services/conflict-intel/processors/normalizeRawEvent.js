import { baseConfidenceForSource } from '../utils/confidence.js';
import { mapSourceEventType } from '../utils/eventMapping.js';
import { isValidCoordinate, toPointGeometry } from '../utils/geospatial.js';
import { computeExpiresAt } from '../utils/timeDecay.js';

function buildEventTitle(rawEvent, mapping) {
  if (rawEvent.title) return rawEvent.title;
  return `${mapping.category.replace(/_/g, ' ')} near ${rawEvent.locationName ?? 'reported location'}`;
}

export default function normalizeRawEvent(rawEvent) {
  if (!rawEvent) {
    throw new Error('Raw event is required for normalization.');
  }

  if (!isValidCoordinate(rawEvent.lat, rawEvent.lng)) {
    throw new Error('Raw event is missing valid coordinates.');
  }

  const mapping = mapSourceEventType(rawEvent.source, rawEvent.eventType, rawEvent.eventSubType);
  const reportedAt = rawEvent.reportedAt ? new Date(rawEvent.reportedAt) : new Date();
  const severity = Math.max(1, Math.min(5, Number(mapping.severity) || 1));
  const confidence = baseConfidenceForSource(rawEvent.source, severity);
  const tags = [...new Set([
    ...(mapping.tags ?? []),
    rawEvent.country ? `country:${String(rawEvent.country).toLowerCase()}` : null,
    rawEvent.locationName ? 'has_location_name' : null,
  ].filter(Boolean))];

  return {
    eventId: `evt_${rawEvent.source}_${rawEvent.sourceEventId}`.replace(/[^a-zA-Z0-9_]+/g, '_'),
    sourceRecords: [rawEvent._id],
    primarySource: rawEvent.source,
    category: mapping.category,
    subcategory: mapping.subcategory,
    severity,
    confidence,
    verificationCount: 1,
    title: buildEventTitle(rawEvent, mapping),
    description: rawEvent.description || rawEvent.title || 'Conflict or hazard signal received from external source.',
    tags,
    location: toPointGeometry(rawEvent.lng, rawEvent.lat),
    locationName: rawEvent.locationName || 'Unknown location',
    country: rawEvent.country || 'Unknown',
    reportedAt,
    expiresAt: computeExpiresAt(reportedAt, severity),
    status: 'active',
    mergedIntoEventId: null,
    metadata: {
      rawSourceKey: `${rawEvent.source}:${rawEvent.sourceEventId}`,
      sourceUrl: rawEvent.sourceUrl ?? null,
      eventType: rawEvent.eventType ?? null,
      eventSubType: rawEvent.eventSubType ?? null,
    },
  };
}
