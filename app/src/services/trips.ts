import { API_URL } from '../constants';
import { ensureSession, refreshSession } from './auth';

interface Point {
  type: 'Point';
  coordinates: [number, number];
}

export interface CreateTripPayload {
  pickupLoc: Point;
  passengers: number;
  accessibilityNeeds?: string;
  notes?: string;
}

export interface CreatedTrip {
  id: string;
  qrToken: string;
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
