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

const polygonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Polygon'], required: true, default: 'Polygon' },
    coordinates: {
      type: [[[Number]]],
      required: true,
    },
  },
  { _id: false }
);

const pickupZoneSchema = new mongoose.Schema(
  {
    pickupZoneId: { type: String, required: true, unique: true, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvacuationRequest', index: true },
    passengerLocation: { type: pointSchema, required: true },
    center: { type: pointSchema, required: true },
    geometry: { type: polygonSchema, required: true },
    riskLevel: {
      type: String,
      enum: ['green', 'yellow', 'orange', 'red'],
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    walkDistanceMeters: { type: Number, required: true, min: 0 },
    driverAccessScore: { type: Number, default: 0, min: 0, max: 100 },
    recommended: { type: Boolean, default: false, index: true },
    basedOnConflictZones: [{ type: String }],
    expiresAt: { type: Date, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

pickupZoneSchema.index({ center: '2dsphere' });
pickupZoneSchema.index({ geometry: '2dsphere' });

export default mongoose.models.PickupZone || mongoose.model('PickupZone', pickupZoneSchema);
