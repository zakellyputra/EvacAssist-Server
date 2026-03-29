import { API_URL } from '../constants';
import { ensureSession } from './auth';

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
  const session = await ensureSession();

  const response = await fetch(`${API_URL}/api/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      pickup_loc: payload.pickupLoc,
      passengers: payload.passengers,
      accessibility_needs: payload.accessibilityNeeds,
      notes: payload.notes,
    }),
  });

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
