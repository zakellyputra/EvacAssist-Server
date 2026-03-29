import axios from 'axios';
import { upsertRawEvents } from '../utils/rawEventIngest.js';

function mapFirmsRecord(record) {
  return {
    sourceEventId: String(record.id ?? `${record.latitude}-${record.longitude}-${record.acq_date}`),
    sourceUrl: process.env.FIRMS_BASE_URL ?? 'https://firms.modaps.eosdis.nasa.gov',
    title: 'NASA FIRMS thermal anomaly',
    description: `Thermal anomaly detected with confidence ${record.confidence ?? 'unknown'}.`,
    eventType: 'fire',
    eventSubType: 'wildfire',
    lat: Number(record.latitude),
    lng: Number(record.longitude),
    locationName: record.locationName ?? 'FIRMS detection',
    country: record.country ?? 'Unknown',
    reportedAt: record.acq_date ? new Date(record.acq_date) : new Date(),
    rawPayload: record,
  };
}

function getMockFirmsRecords() {
  return [
    {
      id: 'firms-001',
      latitude: 40.7414,
      longitude: -73.9718,
      confidence: 86,
      acq_date: new Date().toISOString(),
      country: 'USA',
      locationName: 'Midtown East thermal anomaly',
    },
  ];
}

export default async function firmsFetcher() {
  try {
    let records = [];
    if (process.env.FIRMS_BASE_URL) {
      const response = await axios.get(process.env.FIRMS_BASE_URL, {
        headers: process.env.FIRMS_API_KEY ? { Authorization: `Bearer ${process.env.FIRMS_API_KEY}` } : {},
        timeout: 15000,
      });
      records = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []);
    } else {
      records = getMockFirmsRecords();
    }

    return upsertRawEvents('firms', records.map(mapFirmsRecord));
  } catch (error) {
    console.error('[conflict-intel] FIRMS fetch failed:', error.message);
    return {
      source: 'firms',
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      error: error.message,
    };
  }
}
