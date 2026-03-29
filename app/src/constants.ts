import Constants from 'expo-constants';

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

function inferApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return normalize(configuredUrl);

  // Expo Go host URI is usually "<LAN_IP>:<metro_port>" during development.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:3000`;
  }

  return 'http://localhost:3000';
}

export const API_URL = inferApiUrl();
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
