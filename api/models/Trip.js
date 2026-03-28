import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    rider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed'],
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
    passengers: { type: Number, required: true, min: 1 },
    accessibility_needs: String,
    notes: String,
    qr_token_hash: String,  // SHA-256 hash only — plaintext never stored
    payment_sig: String,    // Solana transaction signature
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

tripSchema.index({ pickup_loc: '2dsphere' });
tripSchema.index({ status: 1 });
tripSchema.index({ rider_id: 1 });
tripSchema.index({ driver_id: 1 });

export default mongoose.model('Trip', tripSchema);
