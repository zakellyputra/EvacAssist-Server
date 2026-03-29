import acledFetcher from '../fetchers/acledFetcher.js';
import firmsFetcher from '../fetchers/firmsFetcher.js';
import liveuamapFetcher from '../fetchers/liveuamapFetcher.js';
import reliefwebFetcher from '../fetchers/reliefwebFetcher.js';
import buildZones from '../processors/buildZones.js';
import dedupeEvents from '../processors/dedupeEvents.js';
import normalizeBatch from '../processors/normalizeBatch.js';

const FETCHERS = [
  acledFetcher,
  reliefwebFetcher,
  firmsFetcher,
  liveuamapFetcher,
];

let refreshInFlight = false;

export default async function refreshConflictIntel() {
  if (refreshInFlight) {
    return {
      ok: false,
      skipped: true,
      reason: 'refresh already in progress',
    };
  }

  refreshInFlight = true;
  const startedAt = new Date();
  const fetchSummaries = [];

  try {
    for (const fetcher of FETCHERS) {
      try {
        fetchSummaries.push(await fetcher());
      } catch (error) {
        fetchSummaries.push({
          source: fetcher.name,
          totalFetched: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          error: error.message,
        });
      }
    }

    const normalization = await normalizeBatch();
    const dedupe = await dedupeEvents();
    const zones = await buildZones();

    return {
      ok: true,
      startedAt,
      finishedAt: new Date(),
      fetchSummaries,
      normalization,
      dedupe,
      zones,
    };
  } finally {
    refreshInFlight = false;
  }
}
