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

const evacuationRequestSchema = new mongoose.Schema(
  {
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pickupLocation: { type: locationSchema, required: true },
    destinationZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone', index: true },
    peopleCount: { type: Number, required: true, min: 1 },
    priorityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    hasChildren: { type: Boolean, default: false },
    hasElderly: { type: Boolean, default: false },
    hasInjured: { type: Boolean, default: false },
    hasDisabilitySupportNeeds: { type: Boolean, default: false },
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'assigned', 'en_route', 'picked_up', 'completed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    assignedTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    assignedDriverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('EvacuationRequest', evacuationRequestSchema);

