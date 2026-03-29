import mongoose from 'mongoose';

const conflictRawEventSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, index: true },
    sourceEventId: { type: String, required: true },
    sourceUrl: String,
    title: String,
    description: String,
    eventType: String,
    eventSubType: String,
    lat: Number,
    lng: Number,
    locationName: String,
    country: String,
    reportedAt: { type: Date, index: true },
    fetchedAt: { type: Date, default: Date.now },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    processingStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    normalizationError: String,
  },
  { timestamps: true }
);

conflictRawEventSchema.index({ source: 1, sourceEventId: 1 }, { unique: true });
conflictRawEventSchema.index({ fetchedAt: -1 });

export default mongoose.models.ConflictRawEvent
  || mongoose.model('ConflictRawEvent', conflictRawEventSchema);
