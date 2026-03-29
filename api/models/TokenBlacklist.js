import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expires_at: {
    type: Date,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['logout', 'revoke', 'reuse_detected'],
    default: 'logout'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// TTL index to auto-remove expired tokens
tokenBlacklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

export default TokenBlacklist;