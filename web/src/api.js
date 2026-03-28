const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { ...opts.headers };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  let res = await fetch(`${BASE}${path}`, { ...opts, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
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
        headers['Authorization'] = `Bearer ${access_token}`;
        res = await fetch(`${BASE}${path}`, { ...opts, headers });
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
