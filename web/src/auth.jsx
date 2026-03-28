import { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from './api';
import { disconnectSocket } from './socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));

  const login = useCallback(async (phone) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { phone },
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setToken(data.access_token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    disconnectSocket();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
