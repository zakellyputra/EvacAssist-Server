import mongoose from 'mongoose';

const syncQueueSchema = new mongoose.Schema(
  {
    device_id: { type: String, required: true },
    operation: { type: String, enum: ['create', 'update'], required: true },
    collection: { type: String, required: true },
    document: mongoose.Schema.Types.Mixed,
    queued_at: { type: Date, required: true },
    synced_at: Date,
  },
  { suppressReservedKeysWarning: true }
);

syncQueueSchema.index({ device_id: 1, synced_at: 1 });

export default mongoose.model('SyncQueue', syncQueueSchema);
