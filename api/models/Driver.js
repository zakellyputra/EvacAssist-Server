import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date,
  },
  { _id: false }
);

const driverSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    licenseVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['offline', 'available', 'assigned', 'en_route_pickup', 'transporting', 'unavailable'],
      default: 'offline',
      index: true,
    },
    currentLocation: locationSchema,
    lastHeartbeatAt: Date,
    capacityOverride: Number,
    notes: String,
  },
  { timestamps: true }
);

driverSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('Driver', driverSchema);

