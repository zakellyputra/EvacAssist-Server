import { upsertRawEvents } from '../utils/rawEventIngest.js';
import { fetchFromApi, fetchFromHtml, resolveLiveuamapMode } from '../utils/liveuamapClient.js';
import {
  getMockLiveuamapRawEvents,
  parseApiResponseToRawEvents,
  parseHtmlToRawEvents,
} from '../utils/liveuamapParser.js';

function buildSummary(mode) {
  return {
    source: 'liveuamap',
    mode,
    totalFetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

function mergeSummaries(baseSummary, ingestSummary) {
  return {
    ...baseSummary,
    totalFetched: ingestSummary.totalFetched,
    inserted: ingestSummary.inserted,
    updated: ingestSummary.updated,
    skipped: baseSummary.skipped + ingestSummary.skipped,
    failed: baseSummary.failed + ingestSummary.failed,
  };
}

async function persistRawEvents(mode, rawEvents, parserErrors = []) {
  const summary = buildSummary(mode);
  summary.skipped += parserErrors.length;
  summary.errors.push(...parserErrors);

  const ingestSummary = await upsertRawEvents('liveuamap', rawEvents);
  return mergeSummaries(summary, ingestSummary);
}

async function runApiMode() {
  const fetchedAt = new Date();
  const payload = await fetchFromApi();
  const { rawEvents, errors } = parseApiResponseToRawEvents(payload, fetchedAt);
  return persistRawEvents('api', rawEvents, errors);
}

async function runHtmlMode() {
  const fetchedAt = new Date();
  const html = await fetchFromHtml();
  const { rawEvents, errors } = parseHtmlToRawEvents(html, fetchedAt);
  return persistRawEvents('html', rawEvents, errors);
}

async function runMockMode() {
  const fetchedAt = new Date();
  const rawEvents = getMockLiveuamapRawEvents(fetchedAt);
  return persistRawEvents('mock', rawEvents);
}

export default async function liveuamapFetcher() {
  const requestedMode = resolveLiveuamapMode();
  const allowHtmlFallback = Boolean(process.env.LIVEUAMAP_BASE_URL);
  const allowMockFallback = true;

  try {
    if (requestedMode === 'mock') {
      return await runMockMode();
    }

    if (requestedMode === 'html') {
      try {
        return await runHtmlMode();
      } catch (htmlError) {
        if (!allowMockFallback) throw htmlError;
        const fallbackSummary = await runMockMode();
        fallbackSummary.errors.unshift(`HTML mode failed: ${htmlError.message}`);
        fallbackSummary.mode = 'mock';
        fallbackSummary.failed += 1;
        return fallbackSummary;
      }
    }

    try {
      return await runApiMode();
    } catch (apiError) {
      if (allowHtmlFallback) {
        try {
          const htmlSummary = await runHtmlMode();
          htmlSummary.errors.unshift(`API mode failed: ${apiError.message}`);
          htmlSummary.mode = 'html';
          htmlSummary.failed += 1;
          return htmlSummary;
        } catch (htmlError) {
          if (!allowMockFallback) throw htmlError;
          const mockSummary = await runMockMode();
          mockSummary.errors.unshift(`HTML fallback failed: ${htmlError.message}`);
          mockSummary.errors.unshift(`API mode failed: ${apiError.message}`);
          mockSummary.mode = 'mock';
          mockSummary.failed += 2;
          return mockSummary;
        }
      }

      if (!allowMockFallback) throw apiError;
      const mockSummary = await runMockMode();
      mockSummary.errors.unshift(`API mode failed: ${apiError.message}`);
      mockSummary.mode = 'mock';
      mockSummary.failed += 1;
      return mockSummary;
    }
  } catch (error) {
    console.error('[conflict-intel] Liveuamap fetch failed:', error.message);
    return {
      source: 'liveuamap',
      mode: requestedMode,
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      errors: [error.message],
    };
  }
}
