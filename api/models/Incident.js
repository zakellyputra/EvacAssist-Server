import mongoose from 'mongoose';

// Structured AI-parsed event. Output of llmParser or vlmParser, stored after geo-fusion.
const incidentSchema = new mongoose.Schema({
  source_type: { type: String, enum: ['text', 'image', 'umap'], required: true },
  event_type: {
    type: String,
    enum: ['armed_clash', 'infrastructure_damage', 'fire', 'flood', 'road_block', 'crowd', 'checkpoint', 'unknown'],
    required: true,
  },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  radius_m: { type: Number, default: 500 },
  severity: { type: Number, required: true, min: 0, max: 1 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  source_weight: { type: Number, required: true, min: 0, max: 1 },
  time_decay_hours: { type: Number, default: 6 },
  affected_segment_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RoadSegment' }],
  raw_report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RawReport' },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

export default mongoose.model('Incident', incidentSchema);
