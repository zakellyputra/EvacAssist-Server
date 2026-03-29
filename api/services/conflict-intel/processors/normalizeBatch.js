import ConflictEvent from '../models/ConflictEvent.js';
import ConflictRawEvent from '../models/ConflictRawEvent.js';
import normalizeRawEvent from './normalizeRawEvent.js';

export default async function normalizeBatch() {
  const summary = {
    totalRaw: 0,
    normalized: 0,
    updated: 0,
    failed: 0,
  };

  const rawEvents = await ConflictRawEvent.find({ processingStatus: 'pending' }).sort({ reportedAt: -1 }).limit(1000);
  summary.totalRaw = rawEvents.length;

  for (const rawEvent of rawEvents) {
    try {
      const normalized = normalizeRawEvent(rawEvent);
      const existing = await ConflictEvent.findOne({ eventId: normalized.eventId }).lean();

      await ConflictEvent.findOneAndUpdate(
        { eventId: normalized.eventId },
        { $set: normalized },
        { upsert: true, new: true }
      );

      rawEvent.processingStatus = 'processed';
      rawEvent.normalizationError = '';
      await rawEvent.save();

      if (existing) summary.updated += 1;
      else summary.normalized += 1;
    } catch (error) {
      rawEvent.processingStatus = 'failed';
      rawEvent.normalizationError = error.message;
      await rawEvent.save();
      summary.failed += 1;
    }
  }

  await ConflictEvent.updateMany(
    { status: 'active', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );

  return summary;
}
