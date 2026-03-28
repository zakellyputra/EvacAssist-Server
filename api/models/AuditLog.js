import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  event_type: { type: String, required: true },
  actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trip_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  payload: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ event_type: 1, timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
