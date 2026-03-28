import mongoose from 'mongoose';

// Loaded from OpenStreetMap via osmLoader.js. Static — only refreshed when OSM data updates.
const roadSegmentSchema = new mongoose.Schema({
  osm_way_id: { type: String, required: true, unique: true },
  start_node: { type: String, required: true },
  end_node: { type: String, required: true },
  geometry: {
    type: { type: String, enum: ['LineString'], required: true },
    coordinates: { type: [[Number]], required: true },
  },
  distance_m: { type: Number, required: true },
  travel_time_s: { type: Number, required: true },
  road_type: {
    type: String,
    enum: ['motorway', 'primary', 'secondary', 'residential', 'path', 'other'],
    default: 'other',
  },
  base_cost: { type: Number, required: true }, // normalized travel_time_s
});

roadSegmentSchema.index({ geometry: '2dsphere' });

export default mongoose.model('RoadSegment', roadSegmentSchema);
