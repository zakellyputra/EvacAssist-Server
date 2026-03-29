import { API_URL } from '../constants';
import { ensureSession, refreshSession } from './auth';

interface Point {
  type: 'Point';
  coordinates: [number, number];
}

export interface CreateTripPayload {
  pickupLoc: Point;
  dropoffLoc?: Point;
  passengers: number;
  accessibilityNeeds?: string;
  notes?: string;
}

export interface CreatedTrip {
  id: string;
  qrToken: string;
}

export interface AvailableTrip {
  _id: string;
  pickup_loc: { coordinates: [number, number] };
  dropoff_loc?: { coordinates: [number, number] };
  passengers: number;
  accessibility_needs?: string;
  notes?: string;
  status: string;
}

export interface TripDriverDetails {
  id: string;
  name: string;
  username: string;
  vehicle?: {
    make?: string;
    model?: string;
    seats?: number;
  };
}

export interface MyTrip {
  _id: string;
  status: string;
  passengers: number;
  created_at: string;
  accepted_at?: string;
  rider_id: string;
  driver_id?: string;
  driver?: TripDriverDetails | null;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteToPickupResult {
  points: RoutePoint[];
  routeRisk?: string;
  durationMin?: number;
  distanceKm?: number;
}

export async function getAvailableTrips(location?: { lat: number; lng: number } | null): Promise<AvailableTrip[]> {
  const buildUrl = () => {
    const url = new URL(`${API_URL}/api/trips/available`);
    if (location?.lat != null && location?.lng != null) {
      url.searchParams.set('lat', String(location.lat));
      url.searchParams.set('lng', String(location.lng));
      url.searchParams.set('radius_km', '15');
    }
    return url.toString();
  };

  const send = (accessToken: string) => fetch(buildUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const session = await ensureSession();
  let response = await send(session.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    response = await send(refreshed.accessToken);
  }
  if (!response.ok) throw new Error(`Failed to fetch trips (${response.status})`);
  const data = await response.json();
  return data.trips ?? data ?? [];
}

export async function getMyTrips(): Promise<MyTrip[]> {
  const send = (accessToken: string) => fetch(`${API_URL}/api/trips/my`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const session = await ensureSession();
  let response = await send(session.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    response = await send(refreshed.accessToken);
  }
  if (!response.ok) throw new Error(`Failed to fetch my trips (${response.status})`);
  const data = await response.json();
  return data.trips ?? data ?? [];
}

export async function acceptTrip(tripId: string): Promise<void> {
  const session = await ensureSession();
  const response = await fetch(`${API_URL}/api/trips/${tripId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Accept failed (${response.status}): ${body}`);
  }
}

export async function calculateRouteToPickup(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteToPickupResult> {
  const session = await ensureSession();

  const directLine = {
    points: [
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng },
    ],
  };

  const send = (accessToken: string) => fetch(`${API_URL}/api/routing/reroute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      origin: [origin.lng, origin.lat],
      destination: [destination.lng, destination.lat],
    }),
  });

  try {
    let response = await send(session.accessToken);
    if (response.status === 401) {
      const refreshed = await refreshSession();
      response = await send(refreshed.accessToken);
    }

    if (!response.ok) return directLine;

    const data = await response.json();
    const coordinates: [number, number][] = data?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return directLine;

    return {
      points: coordinates
        .filter((pair) => Array.isArray(pair) && pair.length >= 2)
        .map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      routeRisk: data?.routeRisk,
      durationMin: typeof data?.durationMin === 'number' ? data.durationMin : undefined,
      distanceKm: typeof data?.distanceKm === 'number' ? data.distanceKm : undefined,
    };
  } catch {
    return directLine;
  }
}

export async function requestEvacuation(payload: CreateTripPayload): Promise<CreatedTrip> {
  const sendCreateTrip = async (accessToken: string) => fetch(`${API_URL}/api/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      pickup_loc: payload.pickupLoc,
      dropoff_loc: payload.dropoffLoc,
      passengers: payload.passengers,
      accessibility_needs: payload.accessibilityNeeds,
      notes: payload.notes,
    }),
  });

  const session = await ensureSession();
  let response = await sendCreateTrip(session.accessToken);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    response = await sendCreateTrip(refreshed.accessToken);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trip request failed (${response.status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.trip?._id ?? '',
    qrToken: data.qr_token ?? '',
  };
}
