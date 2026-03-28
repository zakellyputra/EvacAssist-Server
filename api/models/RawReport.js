import mongoose from 'mongoose';

const rawReportSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image'], required: true },
  content: String,
  image_url: String,
  submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

rawReportSchema.index({ processed: 1, created_at: -1 });

export default mongoose.model('RawReport', rawReportSchema);
