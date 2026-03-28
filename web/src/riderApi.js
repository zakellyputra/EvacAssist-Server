import { BASE } from './api';

const RIDER_ACCESS_TOKEN_KEY = 'rider_access_token';
const RIDER_REFRESH_TOKEN_KEY = 'rider_refresh_token';

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10).toString()).join('');
}

async function registerEmergencyRider() {
  const phone = `555${randomDigits(7)}`;
  const name = `Emergency Rider ${randomDigits(4)}`;

  const response = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      phone,
      role: 'rider',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unable to register rider (${response.status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  localStorage.setItem(RIDER_ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(RIDER_REFRESH_TOKEN_KEY, data.refresh_token);
  return data.access_token;
}

async function refreshRiderToken(refreshToken) {
  const response = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem(RIDER_ACCESS_TOKEN_KEY, data.access_token);
  return data.access_token;
}

async function ensureRiderAccessToken() {
  const existing = localStorage.getItem(RIDER_ACCESS_TOKEN_KEY);
  if (existing) return existing;
  return registerEmergencyRider();
}

async function riderFetch(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let accessToken = await ensureRiderAccessToken();
  headers.Authorization = `Bearer ${accessToken}`;

  let response = await fetch(`${BASE}${path}`, { ...options, headers });
  if (response.status === 401) {
    const refreshToken = localStorage.getItem(RIDER_REFRESH_TOKEN_KEY);
    if (refreshToken) {
      const refreshedAccessToken = await refreshRiderToken(refreshToken);
      if (refreshedAccessToken) {
        headers.Authorization = `Bearer ${refreshedAccessToken}`;
        response = await fetch(`${BASE}${path}`, { ...options, headers });
      }
    }
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

export async function createEvacuationRequest(payload) {
  const data = await riderFetch('/api/trips', {
    method: 'POST',
    body: {
      pickup_loc: payload.pickupLoc,
      passengers: payload.passengers,
      accessibility_needs: payload.accessibilityNeeds,
      notes: payload.notes,
    },
  });

  return {
    tripId: data.trip?._id,
    qrToken: data.qr_token,
    status: data.trip?.status,
  };
}
