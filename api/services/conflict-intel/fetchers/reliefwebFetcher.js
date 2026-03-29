import axios from 'axios';
import { upsertRawEvents } from '../utils/rawEventIngest.js';

function mapReliefWebItem(item) {
  const source = item.fields?.source?.[0];
  const country = item.fields?.country?.[0]?.name;
  const locationName = item.fields?.primary_country?.name ?? country ?? item.fields?.title;
  const coordinates = item.fields?.location?.lat && item.fields?.location?.lon
    ? { lat: item.fields.location.lat, lng: item.fields.location.lon }
    : null;

  return {
    sourceEventId: String(item.id),
    sourceUrl: item.fields?.url ?? 'https://reliefweb.int',
    title: item.fields?.title ?? 'ReliefWeb report',
    description: item.fields?.body ?? item.fields?.headline?.summary ?? 'Humanitarian hazard update.',
    eventType: item.fields?.disaster_type?.[0]?.name ?? item.fields?.type?.[0]?.name ?? 'security',
    eventSubType: item.fields?.theme?.[0]?.name ?? 'advisory',
    lat: Number(coordinates?.lat),
    lng: Number(coordinates?.lng),
    locationName,
    country,
    reportedAt: item.fields?.date?.created ? new Date(item.fields.date.created) : new Date(),
    rawPayload: item,
  };
}

function getMockReliefWebItems() {
  return [
    {
      id: 'rw-001',
      fields: {
        url: 'https://reliefweb.int',
        title: 'Access restrictions reported on the eastern evacuation route',
        body: 'Humanitarian access constraints reported near the eastern evacuation corridor.',
        disaster_type: [{ name: 'Access' }],
        theme: [{ name: 'Access constraints' }],
        location: { lat: 40.7482, lon: -73.9901 },
        primary_country: { name: 'USA' },
        country: [{ name: 'USA' }],
        date: { created: new Date().toISOString() },
      },
    },
  ];
}

export default async function reliefwebFetcher() {
  try {
    let items = [];
    if (process.env.RELIEFWEB_BASE_URL) {
      const response = await axios.get(process.env.RELIEFWEB_BASE_URL, {
        params: {
          appname: process.env.RELIEFWEB_APPNAME ?? 'evacassist',
          limit: 50,
        },
        timeout: 15000,
      });
      items = Array.isArray(response.data?.data) ? response.data.data : [];
    } else {
      items = getMockReliefWebItems();
    }

    const prepared = items
      .map(mapReliefWebItem)
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    return upsertRawEvents('reliefweb', prepared);
  } catch (error) {
    console.error('[conflict-intel] ReliefWeb fetch failed:', error.message);
    return {
      source: 'reliefweb',
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      error: error.message,
    };
  }
}
