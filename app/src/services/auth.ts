import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

const AUTH_KEY = 'evacassist:auth';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10).toString()).join('');
}

async function registerEmergencyRider(): Promise<AuthSession> {
  const phone = `555${randomDigits(7)}`;
  const name = `Emergency Rider ${randomDigits(4)}`;
  const password = `emergency-${randomDigits(8)}`;

  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      phone,
      password,
      role: 'rider',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Auth failed (${response.status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export async function getSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function ensureSession(): Promise<AuthSession> {
  const existing = await getSession();
  if (existing?.accessToken) return existing;
  return registerEmergencyRider();
}

export async function loginDriver(phone: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed: ${body || response.statusText}`);
  }
  const data = await response.json();
  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function refreshSession(): Promise<AuthSession> {
  const existing = await getSession();
  if (!existing?.refreshToken) {
    return registerEmergencyRider();
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: existing.refreshToken }),
  });

  if (!response.ok) {
    await AsyncStorage.removeItem(AUTH_KEY);
    return registerEmergencyRider();
  }

  const data = await response.json();
  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: existing.refreshToken,
  };

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}
