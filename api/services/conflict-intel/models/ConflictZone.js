import mongoose from 'mongoose';

const geometrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: true,
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const centroidSchema = new mongoose.Schema(
  {
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
        message: 'centroid.coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

const conflictZoneSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, unique: true, index: true },
    zoneType: { type: String, required: true, index: true },
    riskLevel: {
      type: String,
      enum: ['green', 'yellow', 'orange', 'red'],
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    geometry: { type: geometrySchema, required: true },
    centroid: { type: centroidSchema, required: true },
    basedOnEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConflictEvent' }],
    sourceCount: { type: Number, default: 1 },
    eventCount: { type: Number, default: 1 },
    activeFrom: { type: Date, required: true },
    activeUntil: { type: Date, required: true, index: true },
    recommendedAction: {
      type: String,
      enum: ['allow', 'caution', 'reroute_preferred', 'avoid'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'overridden'],
      default: 'active',
      index: true,
    },
    overrideReason: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

conflictZoneSchema.index({ geometry: '2dsphere' });

export default mongoose.models.ConflictZone
  || mongoose.model('ConflictZone', conflictZoneSchema);
