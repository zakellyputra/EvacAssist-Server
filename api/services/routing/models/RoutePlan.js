import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'Point coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

const lineStringSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['LineString'], required: true, default: 'LineString' },
    coordinates: {
      type: [[Number]],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 2;
        },
        message: 'LineString coordinates must contain at least two [lng, lat] points',
      },
    },
  },
  { _id: false }
);

const routePlanSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    origin: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },
    geometry: { type: lineStringSchema, required: true },
    routeRisk: {
      type: String,
      enum: ['safe', 'caution', 'blocked'],
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    recommendedAction: {
      type: String,
      enum: ['allow', 'reroute_preferred', 'avoid'],
      required: true,
    },
    intersectingZones: [{ type: String }],
    distanceKm: { type: Number, required: true, min: 0 },
    durationMin: { type: Number, required: true, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

routePlanSchema.index({ geometry: '2dsphere' });
routePlanSchema.index({ createdAt: -1 });

export default mongoose.models.RoutePlan || mongoose.model('RoutePlan', routePlanSchema);
