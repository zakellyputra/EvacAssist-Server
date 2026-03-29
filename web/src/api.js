const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const BASE = RAW_BASE.replace(/\/+$/, '');

export async function apiFetch(path, opts = {}) {
  const { auth = true, body, headers: inputHeaders, ...rest } = opts;
  const token = auth ? localStorage.getItem('access_token') : null;
  const headers = { ...inputHeaders };
  let requestBody = body;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (requestBody && typeof requestBody === 'object' && !(requestBody instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(requestBody);
  }

  let res = await fetch(`${BASE}${path}`, { ...rest, body: requestBody, headers });

  if (res.status === 401 && token && auth) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const { access_token } = await refreshRes.json();
        localStorage.setItem('access_token', access_token);
        headers.Authorization = `Bearer ${access_token}`;
        res = await fetch(`${BASE}${path}`, { ...rest, body: requestBody, headers });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}
