import axios from 'axios';
import { upsertRawEvents } from '../utils/rawEventIngest.js';

function mapAcledRecord(record) {
  return {
    sourceEventId: String(record.event_id_cnty ?? record.event_id_no_cnty ?? record.id),
    sourceUrl: record.source_url ?? process.env.ACLED_BASE_URL ?? '',
    title: record.event_type ?? 'ACLED event',
    description: record.notes ?? record.sub_event_type ?? 'Conflict event reported by ACLED.',
    eventType: record.event_type,
    eventSubType: record.sub_event_type,
    lat: Number(record.latitude),
    lng: Number(record.longitude),
    locationName: [record.location, record.admin1].filter(Boolean).join(', '),
    country: record.country,
    reportedAt: record.event_date ? new Date(record.event_date) : new Date(),
    rawPayload: record,
  };
}

function getMockAcledRecords() {
  return [
    {
      event_id_cnty: 'acled-001',
      event_type: 'Armed clash',
      sub_event_type: 'Armed clash',
      notes: 'Armed clash reported near the northern corridor checkpoint.',
      latitude: 40.7558,
      longitude: -73.9784,
      location: 'North Corridor',
      admin1: 'Metro District',
      country: 'USA',
      event_date: new Date().toISOString(),
      source_url: 'https://acleddata.com',
    },
  ];
}

export default async function acledFetcher() {
  try {
    let records = [];
    if (process.env.ACLED_BASE_URL) {
      const response = await axios.get(process.env.ACLED_BASE_URL, {
        params: {
          key: process.env.ACLED_API_KEY,
          email: process.env.ACLED_EMAIL,
          limit: 50,
        },
        timeout: 15000,
      });
      records = Array.isArray(response.data?.data) ? response.data.data : [];
    } else {
      records = getMockAcledRecords();
    }

    return upsertRawEvents('acled', records.map(mapAcledRecord));
  } catch (error) {
    console.error('[conflict-intel] ACLED fetch failed:', error.message);
    return {
      source: 'acled',
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      error: error.message,
    };
  }
}
