import * as turf from '@turf/turf';
import { featuresIntersect } from '../utils/geospatial.js';

function mergeGeometryFeatures(features) {
  if (features.length === 1) return features[0];
  const combined = turf.combine(turf.featureCollection(features));
  return combined.features[0];
}

function shouldMerge(left, right) {
  return featuresIntersect(left.feature, right.feature);
}

export default function mergeZones(candidates) {
  const remaining = [...(Array.isArray(candidates) ? candidates : [])];
  const merged = [];

  while (remaining.length) {
    const seed = remaining.shift();
    const cluster = [seed];

    let found = true;
    while (found) {
      found = false;
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        const candidate = remaining[index];
        if (cluster.some((item) => shouldMerge(item, candidate))) {
          cluster.push(candidate);
          remaining.splice(index, 1);
          found = true;
        }
      }
    }

    merged.push({
      zoneType: cluster[0].zoneType,
      feature: mergeGeometryFeatures(cluster.map((item) => item.feature)),
      events: cluster.flatMap((item) => item.events),
      metadata: {
        categories: [...new Set(cluster.flatMap((item) => item.metadata.categories ?? []))],
      },
    });
  }

  return merged;
}
