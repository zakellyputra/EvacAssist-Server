import crypto from 'crypto';
import * as turf from '@turf/turf';
import ConflictEvent from '../models/ConflictEvent.js';
import ConflictZone from '../models/ConflictZone.js';
import { centroidForGeometry } from '../utils/geospatial.js';
import { mapZoneType } from '../utils/eventMapping.js';
import mergeZones from './mergeZones.js';
import scoreZone from './scoreZone.js';

const BUFFER_BY_SEVERITY_KM = {
  5: 5,
  4: 3,
  3: 2,
  2: 1,
  1: 0.5,
};

function buildZoneId(zoneType, eventIds) {
  const digest = crypto.createHash('sha1')
    .update(`${zoneType}:${[...eventIds].sort().join('|')}`)
    .digest('hex')
    .slice(0, 12);
  return `zone_${digest}`;
}

function createCandidate(event) {
  const [lng, lat] = event.location.coordinates;
  const point = turf.point([lng, lat], { eventId: event.eventId });
  const radiusKm = BUFFER_BY_SEVERITY_KM[event.severity] ?? 1;
  const buffer = turf.buffer(point, radiusKm, { units: 'kilometers' });

  return {
    zoneType: mapZoneType(event.category),
    feature: buffer,
    events: [event],
    metadata: {
      categories: [event.category],
    },
  };
}

export default async function buildZones() {
  const activeEvents = await ConflictEvent.find({
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ reportedAt: -1 });

  const summary = {
    activeEvents: activeEvents.length,
    zonesBuilt: 0,
    zonesExpired: 0,
  };

  if (!activeEvents.length) {
    const expireResult = await ConflictZone.updateMany(
      { status: { $in: ['active', 'overridden'] } },
      { $set: { status: 'expired', activeUntil: new Date() } }
    );
    summary.zonesExpired = expireResult.modifiedCount ?? 0;
    return summary;
  }

  const candidates = activeEvents.map(createCandidate);
  const mergedCandidates = mergeZones(candidates);
  const existingZones = await ConflictZone.find({
    zoneId: { $in: mergedCandidates.map((candidate) => buildZoneId(candidate.zoneType, candidate.events.map((event) => event.eventId))) },
  });
  const existingByZoneId = new Map(existingZones.map((zone) => [zone.zoneId, zone]));
  const activeZoneIds = [];

  for (const candidate of mergedCandidates) {
    const uniqueEvents = [...new Map(candidate.events.map((event) => [String(event._id), event])).values()];
    const zoneId = buildZoneId(candidate.zoneType, uniqueEvents.map((event) => event.eventId));
    const scored = scoreZone(uniqueEvents);
    const featureGeometry = candidate.feature.geometry;
    const centroid = centroidForGeometry(candidate.feature);
    const activeFrom = new Date(Math.min(...uniqueEvents.map((event) => new Date(event.reportedAt).getTime())));
    const activeUntil = new Date(Math.max(...uniqueEvents.map((event) => new Date(event.expiresAt).getTime())));
    const existing = existingByZoneId.get(zoneId);

    const update = {
      zoneId,
      zoneType: candidate.zoneType,
      riskLevel: scored.riskLevel,
      score: scored.score,
      confidence: scored.confidence,
      geometry: featureGeometry,
      centroid,
      basedOnEvents: uniqueEvents.map((event) => event._id),
      sourceCount: new Set(uniqueEvents.map((event) => event.primarySource)).size,
      eventCount: uniqueEvents.length,
      activeFrom,
      activeUntil,
      recommendedAction: existing?.status === 'overridden'
        ? (existing.recommendedAction ?? scored.recommendedAction)
        : scored.recommendedAction,
      status: existing?.status === 'overridden' ? 'overridden' : 'active',
      overrideReason: existing?.status === 'overridden' ? existing.overrideReason : '',
      metadata: {
        categories: [...new Set(uniqueEvents.map((event) => event.category))],
        eventIds: uniqueEvents.map((event) => event.eventId),
      },
    };

    await ConflictZone.findOneAndUpdate({ zoneId }, { $set: update }, { upsert: true, new: true });
    activeZoneIds.push(zoneId);
  }

  const expireResult = await ConflictZone.updateMany(
    {
      zoneId: { $nin: activeZoneIds },
      status: { $in: ['active', 'overridden'] },
    },
    { $set: { status: 'expired', activeUntil: new Date() } }
  );

  summary.zonesBuilt = activeZoneIds.length;
  summary.zonesExpired = expireResult.modifiedCount ?? 0;
  return summary;
}
