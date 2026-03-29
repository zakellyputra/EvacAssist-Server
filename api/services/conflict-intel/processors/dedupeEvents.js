import ConflictEvent from '../models/ConflictEvent.js';
import { boostConfidenceForVerification } from '../utils/confidence.js';
import { coordinatesWithinDistanceKm, jaccardSimilarity } from '../utils/geospatial.js';

function withinOneHour(left, right) {
  return Math.abs(new Date(left.reportedAt).getTime() - new Date(right.reportedAt).getTime()) <= 60 * 60 * 1000;
}

function areDuplicates(left, right) {
  if (left.eventId === right.eventId) return false;
  if (left.status !== 'active' || right.status !== 'active') return false;
  if (left.category !== right.category) return false;
  if (!withinOneHour(left, right)) return false;

  const [leftLng, leftLat] = left.location.coordinates;
  const [rightLng, rightLat] = right.location.coordinates;
  const closeEnough = coordinatesWithinDistanceKm(
    { lat: leftLat, lng: leftLng },
    { lat: rightLat, lng: rightLng },
    1
  );

  if (!closeEnough) return false;

  const similarity = Math.max(
    jaccardSimilarity(left.title, right.title),
    jaccardSimilarity(left.description, right.description),
  );

  return similarity >= 0.2 || left.subcategory === right.subcategory;
}

function chooseCanonical(left, right) {
  if ((left.confidence ?? 0) !== (right.confidence ?? 0)) {
    return (left.confidence ?? 0) >= (right.confidence ?? 0) ? left : right;
  }
  if ((left.severity ?? 0) !== (right.severity ?? 0)) {
    return (left.severity ?? 0) >= (right.severity ?? 0) ? left : right;
  }
  return new Date(left.reportedAt) <= new Date(right.reportedAt) ? left : right;
}

export default async function dedupeEvents() {
  const activeEvents = await ConflictEvent.find({ status: 'active' }).sort({ reportedAt: -1 });
  const summary = {
    scanned: activeEvents.length,
    merged: 0,
  };

  const handled = new Set();

  for (let i = 0; i < activeEvents.length; i += 1) {
    const candidate = activeEvents[i];
    if (handled.has(String(candidate._id))) continue;

    for (let j = i + 1; j < activeEvents.length; j += 1) {
      const other = activeEvents[j];
      if (handled.has(String(other._id))) continue;
      if (!areDuplicates(candidate, other)) continue;

      const canonical = chooseCanonical(candidate, other);
      const duplicate = canonical._id.equals(candidate._id) ? other : candidate;

      canonical.sourceRecords = [...new Set([
        ...canonical.sourceRecords.map(String),
        ...duplicate.sourceRecords.map(String),
      ])];
      canonical.verificationCount = canonical.sourceRecords.length;
      canonical.confidence = boostConfidenceForVerification(
        Math.max(canonical.confidence, duplicate.confidence),
        canonical.verificationCount,
        new Set([canonical.primarySource, duplicate.primarySource]).size,
      );
      canonical.severity = Math.max(canonical.severity, duplicate.severity);
      canonical.reportedAt = new Date(
        Math.min(new Date(canonical.reportedAt).getTime(), new Date(duplicate.reportedAt).getTime())
      );
      canonical.expiresAt = new Date(
        Math.max(new Date(canonical.expiresAt).getTime(), new Date(duplicate.expiresAt).getTime())
      );
      canonical.tags = [...new Set([...(canonical.tags ?? []), ...(duplicate.tags ?? [])])];
      canonical.description = canonical.description.length >= duplicate.description.length
        ? canonical.description
        : duplicate.description;
      await canonical.save();

      duplicate.status = 'merged';
      duplicate.mergedIntoEventId = canonical.eventId;
      await duplicate.save();

      handled.add(String(duplicate._id));
      summary.merged += 1;
    }
  }

  return summary;
}
