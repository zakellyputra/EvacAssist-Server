import axios from 'axios';
import { upsertRawEvents } from '../utils/rawEventIngest.js';

function mapLiveuamapRecord(record) {
  return {
    sourceEventId: String(record.id),
    sourceUrl: record.url ?? process.env.LIVEUAMAP_BASE_URL ?? '',
    title: record.title ?? 'Live feed event',
    description: record.description ?? 'Live conflict feed event.',
    eventType: record.type ?? 'military',
    eventSubType: record.subtype ?? record.type ?? 'military',
    lat: Number(record.lat),
    lng: Number(record.lng),
    locationName: record.locationName ?? record.title ?? 'Unknown location',
    country: record.country ?? 'Unknown',
    reportedAt: record.reportedAt ? new Date(record.reportedAt) : new Date(),
    rawPayload: record,
  };
}

function getMockLiveuamapRecords() {
  return [
    {
      id: 'live-001',
      title: 'Checkpoint and convoy activity reported',
      description: 'Open-source live feed indicates military movement near the west corridor.',
      type: 'military',
      subtype: 'military',
      lat: 40.7445,
      lng: -73.9994,
      country: 'USA',
      locationName: 'West Corridor',
      reportedAt: new Date().toISOString(),
    },
  ];
}

export default async function liveuamapFetcher() {
  try {
    let records = [];
    if (process.env.LIVEUAMAP_BASE_URL) {
      const response = await axios.get(process.env.LIVEUAMAP_BASE_URL, { timeout: 15000 });
      records = Array.isArray(response.data?.data) ? response.data.data : [];
    } else {
      records = getMockLiveuamapRecords();
    }

    return upsertRawEvents('liveuamap', records.map(mapLiveuamapRecord));
  } catch (error) {
    console.error('[conflict-intel] Liveuamap fetch failed:', error.message);
    return {
      source: 'liveuamap',
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      error: error.message,
    };
  }
}
