import mongoose from 'mongoose';

const conflictEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    sourceRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConflictRawEvent' }],
    primarySource: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    subcategory: String,
    severity: { type: Number, required: true, min: 1, max: 5 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    verificationCount: { type: Number, default: 1, min: 1 },
    title: String,
    description: String,
    tags: [{ type: String }],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return Array.isArray(value) && value.length === 2;
          },
          message: 'location.coordinates must be [lng, lat]',
        },
      },
    },
    locationName: String,
    country: String,
    reportedAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'merged', 'suppressed'],
      default: 'active',
      index: true,
    },
    mergedIntoEventId: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

conflictEventSchema.index({ location: '2dsphere' });
conflictEventSchema.index({ primarySource: 1, status: 1 });

export default mongoose.models.ConflictEvent
  || mongoose.model('ConflictEvent', conflictEventSchema);
