import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone_hash: { type: String, required: true, unique: true },
  role: { type: String, enum: ['rider', 'driver', 'admin'], required: true },
  vehicle: {
    make: String,
    model: String,
    seats: Number,
  },
  wallet_address: String, // Solana public key (Base58), drivers only
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
