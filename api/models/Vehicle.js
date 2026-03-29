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

const vehicleSchema = new mongoose.Schema(
  {
    driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['car', 'van', 'bus', 'truck', 'other'],
      default: 'other',
    },
    label: String,
    plateNumber: String,
    seatCapacity: Number,
    wheelchairAccessible: { type: Boolean, default: false },
    fuelLevelPercent: Number,
    isActive: { type: Boolean, default: true, index: true },
    currentLocation: locationSchema,
  },
  { timestamps: true }
);

export default mongoose.model('Vehicle', vehicleSchema);

