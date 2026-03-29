import mongoose from 'mongoose';

const routeRiskSnapshotSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    route: { type: mongoose.Schema.Types.Mixed, required: true },
    checkedAt: { type: Date, default: Date.now, index: true },
    result: {
      type: String,
      enum: ['safe', 'caution', 'blocked'],
      required: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    intersectingZoneIds: [{ type: String }],
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.models.RouteRiskSnapshot
  || mongoose.model('RouteRiskSnapshot', routeRiskSnapshotSchema);
