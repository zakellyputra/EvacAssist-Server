import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 15000;

function createClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
      'User-Agent': 'EvacAssist-ConflictIntel/1.0',
    },
  });
}

export function resolveLiveuamapMode() {
  const explicitMode = String(process.env.LIVEUAMAP_MODE ?? '').trim().toLowerCase();
  if (explicitMode === 'api' || explicitMode === 'html' || explicitMode === 'mock') {
    return explicitMode;
  }

  const hasApiConfig = Boolean(process.env.LIVEUAMAP_API_URL)
    || Boolean(process.env.LIVEUAMAP_BASE_URL && process.env.LIVEUAMAP_API_KEY);

  return hasApiConfig ? 'api' : 'mock';
}

function buildApiConfig() {
  const endpoint = process.env.LIVEUAMAP_API_URL || process.env.LIVEUAMAP_BASE_URL;
  const headers = {};
  const params = {};

  if (process.env.LIVEUAMAP_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LIVEUAMAP_API_KEY}`;
    headers['x-api-key'] = process.env.LIVEUAMAP_API_KEY;
    params.apiKey = process.env.LIVEUAMAP_API_KEY;
  }

  if (process.env.LIVEUAMAP_REGION) {
    params.region = process.env.LIVEUAMAP_REGION;
  }

  params.limit = 100;

  return { endpoint, headers, params };
}

export async function fetchFromApi() {
  const { endpoint, headers, params } = buildApiConfig();
  if (!endpoint) {
    throw new Error('LIVEUAMAP_API_URL or LIVEUAMAP_BASE_URL is required for api mode.');
  }

  const client = createClient(endpoint);
  const response = await client.get('', { headers, params });
  return response.data;
}

export async function fetchFromHtml() {
  const endpoint = process.env.LIVEUAMAP_BASE_URL;
  if (!endpoint) {
    throw new Error('LIVEUAMAP_BASE_URL is required for html mode.');
  }

  const client = createClient(endpoint);
  const response = await client.get('', {
    responseType: 'text',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  return response.data;
}
