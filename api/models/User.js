import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true },
  username_normalized: { type: String, required: true, unique: true, sparse: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver', 'admin'], required: true },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  vehicle: {
    make: String,
    model: String,
    seats: Number,
  },
  wallet_address: String,
  created_at: { type: Date, default: Date.now },
});

userSchema.pre('validate', function setNormalizedUsername(next) {
  if (this.username) {
    this.username_normalized = this.username.trim().toLowerCase();
  }

  if (this.role === 'driver' && !this.approval_status) {
    this.approval_status = 'pending';
  }

  if (this.role !== 'driver' && !this.approval_status) {
    this.approval_status = 'approved';
  }

  next();
});

export default mongoose.model('User', userSchema);
