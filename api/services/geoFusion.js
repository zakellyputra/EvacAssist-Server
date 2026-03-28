import * as turf from '@turf/turf';
import RoadSegment from '../models/RoadSegment.js';
import EdgeRisk from '../models/EdgeRisk.js';
import Incident from '../models/Incident.js';

// Maps incident event_type to the EdgeRisk field it primarily affects
const EVENT_FIELD_MAP = {
  armed_clash:            'conflict_risk',
  infrastructure_damage:  'infra_risk',
  fire:                   'blockage_risk',
  flood:                  'weather_risk',
  road_block:             'blockage_risk',
  crowd:                  'crowd_risk',
  checkpoint:             'conflict_risk',
  unknown:                'uncertainty',
};

/**
 * Find all road segments within an incident's influence radius and apply
 * the incident's risk to those edges. Multiple incidents on the same segment
 * use max() per component (conservative).
 *
 * @param {object} incident - Structured incident from llmParser or vlmParser
 */
export async function fuseIncident(incident) {
  const { coordinates, radius_m, event_type, severity, confidence, source_weight } = incident;
  if (!coordinates?.lat || !coordinates?.lng) return;

  const [lng, lat] = [coordinates.lng, coordinates.lat];
  const point = turf.point([lng, lat]);
  const buffer = turf.buffer(point, radius_m / 1000, { units: 'kilometers' });

  // Find all segments whose geometry intersects the influence buffer
  const segments = await RoadSegment.find({
    geometry: {
      $geoIntersects: { $geometry: buffer.geometry },
    },
  }).select('_id base_cost');

  const riskField = EVENT_FIELD_MAP[event_type] ?? 'uncertainty';

  for (const segment of segments) {
    await EdgeRisk.findOneAndUpdate(
      { segment_id: segment._id },
      {
        $max: { [riskField]: severity }, // conservative: keep highest observed value
        $set: {
          confidence: confidence * source_weight,
          last_updated: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // Persist affected segment IDs back to the incident document
  const segmentIds = segments.map((s) => s._id);
  await Incident.findByIdAndUpdate(incident._id, {
    $addToSet: { affected_segment_ids: { $each: segmentIds } },
  });
}

/**
 * Hourly cron job: decay all edge risks toward zero as incidents age out.
 * Expired incidents are removed by MongoDB TTL index automatically.
 * This handles progressive freshness reduction on still-active incidents.
 */
export async function decayIncidents() {
  // Recompute each EdgeRisk from its still-active incidents
  const activeIncidents = await Incident.find({ expires_at: { $gt: new Date() } });

  // Group incidents by affected segment
  const segmentRiskMap = new Map();

  for (const inc of activeIncidents) {
    const riskField = EVENT_FIELD_MAP[inc.event_type] ?? 'uncertainty';
    const hoursAgo = (Date.now() - inc.created_at.getTime()) / 3_600_000;
    const freshness = Math.exp(-0.1 * hoursAgo);
    const effectiveValue = inc.severity * inc.confidence * freshness * inc.source_weight;

    for (const segId of inc.affected_segment_ids) {
      const key = segId.toString();
      if (!segmentRiskMap.has(key)) segmentRiskMap.set(key, {});
      const entry = segmentRiskMap.get(key);
      entry[riskField] = Math.max(entry[riskField] ?? 0, effectiveValue);
    }
  }

  // Flush decayed values to EdgeRisk collection
  for (const [segId, fields] of segmentRiskMap) {
    await EdgeRisk.findOneAndUpdate(
      { segment_id: segId },
      { $set: { ...fields, last_updated: new Date() } },
      { upsert: true }
    );
  }

  console.log(`[geoFusion] Decayed ${activeIncidents.length} active incidents across ${segmentRiskMap.size} segments`);
}
