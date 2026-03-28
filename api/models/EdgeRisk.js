import mongoose from 'mongoose';

// One document per road segment. Updated by geoFusion.js on each new incident.
const edgeRiskSchema = new mongoose.Schema({
  segment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoadSegment',
    required: true,
    unique: true,
  },
  conflict_risk:  { type: Number, default: 0, min: 0, max: 1 },
  blockage_risk:  { type: Number, default: 0, min: 0, max: 1 },
  infra_risk:     { type: Number, default: 0, min: 0, max: 1 },
  crowd_risk:     { type: Number, default: 0, min: 0, max: 1 },
  weather_risk:   { type: Number, default: 0, min: 0, max: 1 },
  uncertainty:    { type: Number, default: 0, min: 0, max: 1 },
  confidence:     { type: Number, default: 0, min: 0, max: 1 },
  is_hard_blocked: { type: Boolean, default: false },
  last_updated: { type: Date, default: Date.now },
});

export default mongoose.model('EdgeRisk', edgeRiskSchema);
