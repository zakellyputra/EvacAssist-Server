import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'evacassist-admin-session';

const DEMO_ACCOUNT = {
  email: 'ops.admin@evacassist.local',
  password: 'evac-demo',
  user: {
    name: 'Maya Chen',
    role: 'Admin Coordinator',
    team: 'Metro Evacuation Desk',
  },
};

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  const login = useCallback(async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail !== DEMO_ACCOUNT.email
      || password !== DEMO_ACCOUNT.password
    ) {
      throw new Error('Use the Phase 1 demo credentials to enter the dashboard.');
    }

    const nextSession = {
      email: DEMO_ACCOUNT.email,
      user: DEMO_ACCOUNT.user,
      signedInAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: Boolean(session),
    user: session?.user ?? null,
    email: session?.email ?? null,
    signedInAt: session?.signedInAt ?? null,
    login,
    logout,
    demoCredentials: {
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
    },
  }), [login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
