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

export default async function acledFetcher() {
  try {
    if (String(process.env.ACLED_DISABLED ?? '').toLowerCase() === 'true') {
      return {
        source: 'acled',
        mode: 'disabled',
        totalFetched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };
    }

    if (!process.env.ACLED_BASE_URL || !process.env.ACLED_API_KEY || !process.env.ACLED_EMAIL) {
      return {
        source: 'acled',
        mode: 'unconfigured',
        totalFetched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };
    }

    const response = await axios.get(process.env.ACLED_BASE_URL, {
      params: {
        key: process.env.ACLED_API_KEY,
        email: process.env.ACLED_EMAIL,
        limit: 50,
      },
      timeout: 15000,
    });
    const records = Array.isArray(response.data?.data) ? response.data.data : [];
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
