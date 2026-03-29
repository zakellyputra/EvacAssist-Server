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

const tripSchema = new mongoose.Schema(
  {
    rider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvacuationRequest' },
    driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'in_progress',
        'completed',
        'planned',
        'driver_assigned',
        'driver_en_route',
        'arrived_pickup',
        'passenger_verified',
        'in_transit',
        'cancelled',
        'failed',
        'rerouted',
      ],
      default: 'pending',
    },
    pickup_loc: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    dropoff_loc: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    pickupLocation: locationSchema,
    dropoffLocation: locationSchema,
    passengers: { type: Number, required: true, min: 1 },
    estimatedDistanceKm: Number,
    estimatedDurationMin: Number,
    startedAt: Date,
    completedAt: Date,
    joiningClosed: { type: Boolean, default: false },
    dispatchReadyAt: Date,
    dispatchReadyByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    readinessChecks: {
      driverAssigned: { type: Boolean, default: false },
      vehicleAssigned: { type: Boolean, default: false },
      alertsCleared: { type: Boolean, default: false },
      operatorReviewed: { type: Boolean, default: false },
    },
    accessibility_needs: String,
    notes: String,
    qr_token_hash: String,  // SHA-256 hash only — plaintext never stored
    payment_sig: String,    // Solana transaction signature
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

tripSchema.pre('validate', function syncLegacyAndSchemaFields(next) {
  if (this.driverUserId && !this.driver_id) this.driver_id = this.driverUserId;
  if (this.driver_id && !this.driverUserId) this.driverUserId = this.driver_id;

  if (this.pickupLocation && !this.pickup_loc?.coordinates?.length) {
    this.pickup_loc = {
      type: 'Point',
      coordinates: [this.pickupLocation.lng, this.pickupLocation.lat],
    };
  }

  if (this.dropoffLocation && !this.dropoff_loc?.coordinates?.length) {
    this.dropoff_loc = {
      type: 'Point',
      coordinates: [this.dropoffLocation.lng, this.dropoffLocation.lat],
    };
  }

  if (!this.pickupLocation && this.pickup_loc?.coordinates?.length === 2) {
    this.pickupLocation = {
      lat: this.pickup_loc.coordinates[1],
      lng: this.pickup_loc.coordinates[0],
    };
  }

  if (!this.dropoffLocation && this.dropoff_loc?.coordinates?.length === 2) {
    this.dropoffLocation = {
      lat: this.dropoff_loc.coordinates[1],
      lng: this.dropoff_loc.coordinates[0],
    };
  }

  next();
});

tripSchema.index({ pickup_loc: '2dsphere' });
tripSchema.index({ status: 1 });
tripSchema.index({ rider_id: 1 });
tripSchema.index({ driver_id: 1 });
tripSchema.index({ requestId: 1 });
tripSchema.index({ driverUserId: 1 });
tripSchema.index({ vehicleId: 1 });

export default mongoose.model('Trip', tripSchema);
