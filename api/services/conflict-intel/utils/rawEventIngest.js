import ConflictRawEvent from '../models/ConflictRawEvent.js';

export async function upsertRawEvents(source, events) {
  const summary = {
    source,
    totalFetched: Array.isArray(events) ? events.length : 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const event of Array.isArray(events) ? events : []) {
    try {
      if (!event?.sourceEventId) {
        summary.skipped += 1;
        continue;
      }

      const filter = { source, sourceEventId: String(event.sourceEventId) };
      const existing = await ConflictRawEvent.findOne(filter).lean();
      const update = {
        ...event,
        source,
        sourceEventId: String(event.sourceEventId),
        fetchedAt: new Date(),
        processingStatus: 'pending',
        normalizationError: '',
      };

      await ConflictRawEvent.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true });
      if (existing) summary.updated += 1;
      else summary.inserted += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`[conflict-intel] Failed to upsert raw event for ${source}:`, error.message);
    }
  }

  return summary;
}
