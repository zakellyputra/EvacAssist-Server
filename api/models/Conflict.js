import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema(
  {
    conflictKey: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'DRIVER_DOUBLE_BOOKED',
        'VEHICLE_DOUBLE_BOOKED',
        'RIDE_OVER_CAPACITY',
        'RIDE_FULL',
        'READINESS_BLOCKED',
        'CRITICAL_ALERT_ACTIVE',
        'DISPATCH_STATE_INVALID',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'overridden'],
      default: 'active',
      index: true,
    },
    blocking: { type: Boolean, default: false, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvacuationRequest', index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', index: true },
    message: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    detectedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,
  },
  { timestamps: true }
);

conflictSchema.index({ conflictKey: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

export default mongoose.model('Conflict', conflictSchema);

