import { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from './api';
import { disconnectSocket } from './socket';

const AuthContext = createContext(null);

function decodeToken(token) {
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const user = decodeToken(token);

  const login = useCallback(async (username, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setToken(data.access_token);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: payload,
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setToken(data.access_token);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    disconnectSocket();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role ?? null,
        username: user?.username ?? null,
        isAuthenticated: Boolean(token),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
