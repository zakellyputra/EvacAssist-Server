import * as turf from '@turf/turf';

export function isValidCoordinate(lat, lng) {
  return Number.isFinite(Number(lat))
    && Number.isFinite(Number(lng))
    && Math.abs(Number(lat)) <= 90
    && Math.abs(Number(lng)) <= 180;
}

export function toPointGeometry(lng, lat) {
  return {
    type: 'Point',
    coordinates: [Number(lng), Number(lat)],
  };
}

export function toPointFeature(lng, lat, properties = {}) {
  return turf.point([Number(lng), Number(lat)], properties);
}

export function ensureLineString(routeInput) {
  if (routeInput?.type === 'Feature' && routeInput.geometry?.type === 'LineString') {
    return routeInput;
  }
  if (routeInput?.type === 'LineString') {
    return turf.feature(routeInput);
  }
  if (Array.isArray(routeInput)) {
    return turf.lineString(routeInput);
  }
  throw new Error('Route must be a GeoJSON LineString or an array of [lng, lat] coordinates.');
}

export function parseBBox(bbox) {
  if (!bbox) return null;
  const parts = String(bbox).split(',').map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    throw new Error('bbox must be minLng,minLat,maxLng,maxLat');
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}

export function bboxToPolygon(bbox) {
  return turf.bboxPolygon([bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]).geometry;
}

export function coordinatesWithinDistanceKm(a, b, kilometers) {
  return turf.distance(toPointFeature(a.lng, a.lat), toPointFeature(b.lng, b.lat), { units: 'kilometers' }) <= kilometers;
}

export function pointInsideGeometry(lng, lat, geometry) {
  return turf.booleanPointInPolygon(toPointFeature(lng, lat), geometry);
}

export function centroidForGeometry(geometry) {
  const centroid = turf.centroid(geometry);
  return {
    type: 'Point',
    coordinates: centroid.geometry.coordinates,
  };
}

export function distanceKmFromPointToCentroid(lng, lat, centroid) {
  return turf.distance(
    toPointFeature(lng, lat),
    turf.point(centroid.coordinates),
    { units: 'kilometers' },
  );
}

export function featuresIntersect(a, b) {
  return turf.booleanIntersects(a, b);
}

export function keywordTokens(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

export function jaccardSimilarity(left, right) {
  const leftSet = new Set(keywordTokens(left));
  const rightSet = new Set(keywordTokens(right));
  if (!leftSet.size || !rightSet.size) return 0;
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}
