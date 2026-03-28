import mongoose from 'mongoose';

const riskZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  geometry: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
  risk_level: { type: String, enum: ['low', 'moderate', 'high', 'critical'], required: true },
  source: { type: String, default: 'operator' },
  updated_at: { type: Date, default: Date.now },
});

riskZoneSchema.index({ geometry: '2dsphere' });
riskZoneSchema.index({ risk_level: 1 });

export default mongoose.model('RiskZone', riskZoneSchema);
