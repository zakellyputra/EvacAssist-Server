function buildUrl(baseUrl, path) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');
  return `${base}${path}`;
}

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || response.statusText);
  }
  return payload;
}

export async function fetchConflictZones({ baseUrl = '', bbox = null, fetchImpl = fetch } = {}) {
  const query = bbox ? `?bbox=${encodeURIComponent(bbox)}` : '';
  const response = await fetchImpl(buildUrl(baseUrl, `/api/conflict/zones${query}`));
  return parseJsonResponse(response);
}

export async function fetchConflictSummary({ baseUrl = '', fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildUrl(baseUrl, '/api/conflict/summary'));
  return parseJsonResponse(response);
}

export async function checkConflictPoint({ baseUrl = '', lat, lng, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(
    buildUrl(baseUrl, `/api/conflict/check-point?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`)
  );
  return parseJsonResponse(response);
}

export async function checkConflictRoute({ baseUrl = '', route, tripId = null, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildUrl(baseUrl, '/api/conflict/check-route'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route, tripId }),
  });
  return parseJsonResponse(response);
}
