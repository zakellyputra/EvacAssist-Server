import { API_URL } from '../constants';

interface ApiRiskZone {
  _id?: string;
  id?: string;
  name?: string;
  risk_level?: 'low' | 'moderate' | 'high' | 'critical';
  source?: string;
  geometry?: {
    type?: 'Polygon';
    coordinates?: number[][][];
  };
}

interface ApiConflictZonesResponse {
  zones?: Array<{
    zoneId?: string;
    zoneType?: string;
    riskLevel?: 'green' | 'yellow' | 'orange' | 'red';
    geometry?: {
      type?: 'Polygon';
      coordinates?: number[][][];
    };
  }>;
}

export interface MapRiskZone {
  id: string;
  name: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  source: string;
  coordinates: { latitude: number; longitude: number }[];
  center: { latitude: number; longitude: number };
}

const LOCAL_FALLBACK_ZONES: ApiRiskZone[] = [
  {
    _id: 'local-fallback-zone-1',
    name: 'Fallback Zone Alpha',
    risk_level: 'critical',
    source: 'local_test_fallback',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-122.428, 37.782],
        [-122.412, 37.782],
        [-122.412, 37.769],
        [-122.428, 37.769],
        [-122.428, 37.782],
      ]],
    },
  },
  {
    _id: 'local-fallback-zone-2',
    name: 'Fallback Zone Bravo',
    risk_level: 'high',
    source: 'local_test_fallback',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-122.409, 37.767],
        [-122.394, 37.767],
        [-122.394, 37.754],
        [-122.409, 37.754],
        [-122.409, 37.767],
      ]],
    },
  },
];

function normalizeZone(zone: ApiRiskZone, index: number): MapRiskZone | null {
  const ring = zone.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const coordinates = ring
    .filter((pair): pair is [number, number] => (
      Array.isArray(pair) && pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1])
    ))
    .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

  if (coordinates.length < 3) return null;

  const center = coordinates.reduce(
    (acc, point) => ({ latitude: acc.latitude + point.latitude, longitude: acc.longitude + point.longitude }),
    { latitude: 0, longitude: 0 }
  );

  return {
    id: String(zone._id ?? zone.id ?? `zone-${index}`),
    name: zone.name?.trim() || `Risk Zone ${index + 1}`,
    riskLevel: zone.risk_level ?? 'moderate',
    source: zone.source ?? 'unknown',
    coordinates,
    center: {
      latitude: center.latitude / coordinates.length,
      longitude: center.longitude / coordinates.length,
    },
  };
}

function normalizeZones(rawZones: ApiRiskZone[]): MapRiskZone[] {
  return rawZones
    .map(normalizeZone)
    .filter((zone): zone is MapRiskZone => Boolean(zone));
}

function mapConflictRiskLevel(level?: 'green' | 'yellow' | 'orange' | 'red'): MapRiskZone['riskLevel'] {
  switch (level) {
    case 'red':
      return 'critical';
    case 'orange':
      return 'high';
    case 'yellow':
      return 'moderate';
    default:
      return 'low';
  }
}

function normalizeConflictZones(data: ApiConflictZonesResponse): MapRiskZone[] {
  const zones = Array.isArray(data?.zones) ? data.zones : [];
  return zones
    .map((zone, index) => normalizeZone({
      _id: zone.zoneId ?? `conflict-zone-${index}`,
      name: zone.zoneType ? `Conflict ${zone.zoneType}` : `Conflict Zone ${index + 1}`,
      risk_level: mapConflictRiskLevel(zone.riskLevel),
      source: 'conflict_intel',
      geometry: zone.geometry,
    }, index))
    .filter((zone): zone is MapRiskZone => Boolean(zone));
}

export async function fetchMapRiskZones(): Promise<{ zones: MapRiskZone[]; usingFallback: boolean }> {
  try {
    const conflictResponse = await fetch(`${API_URL}/api/conflict/zones`);
    if (conflictResponse.ok) {
      const conflictData: ApiConflictZonesResponse = await conflictResponse.json();
      const conflictZones = normalizeConflictZones(conflictData);
      if (conflictZones.length > 0) {
        const usingConflictFallback = conflictZones.every((zone) => zone.id.startsWith('fallback-'));
        return { zones: conflictZones, usingFallback: usingConflictFallback };
      }
    }
  } catch {
    // Fall through to standard zones and then local fallback.
  }

  try {
    const response = await fetch(`${API_URL}/api/zones/public`);
    if (!response.ok) throw new Error(`Failed to load zones (${response.status})`);

    const data = await response.json();
    const zones = normalizeZones(Array.isArray(data) ? data : []);
    if (zones.length > 0) {
      const usingApiFallback = zones.every((zone) => zone.source.includes('fallback'));
      return { zones, usingFallback: usingApiFallback };
    }
  } catch {
    // Fall through to local fallback.
  }

  return {
    zones: normalizeZones(LOCAL_FALLBACK_ZONES),
    usingFallback: true,
  };
}
