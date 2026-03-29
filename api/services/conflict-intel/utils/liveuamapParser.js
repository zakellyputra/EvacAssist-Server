import * as cheerio from 'cheerio';
import { isValidCoordinate } from './geospatial.js';

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeDate(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function candidateValue(record, keys = []) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

function normalizeCountry(record) {
  return normalizeText(
    candidateValue(record, ['country', 'country_name', 'region', 'area']),
    'Unknown',
  );
}

function normalizeLocationName(record) {
  return normalizeText(
    candidateValue(record, ['locationName', 'location', 'place', 'city', 'title']),
    'Unknown location',
  );
}

function normalizeEventType(record) {
  return normalizeText(
    candidateValue(record, ['eventType', 'type', 'category']),
    'military_activity',
  );
}

function normalizeEventSubType(record) {
  return normalizeText(
    candidateValue(record, ['eventSubType', 'subtype', 'kind', 'event_type']),
    normalizeEventType(record),
  );
}

function normalizeCoordinates(record) {
  const lat = Number(candidateValue(record, ['lat', 'latitude', 'y']));
  const lng = Number(candidateValue(record, ['lng', 'lon', 'longitude', 'x']));
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }
  return { lat, lng };
}

function normalizeSourceEventId(record, index = 0) {
  return String(
    candidateValue(record, ['id', 'eventId', 'slug', 'uuid'])
      ?? `liveuamap-${Date.now()}-${index}`,
  );
}

function normalizeVenueEventType(record) {
  const keywords = `${record?.keywords ?? ''} ${record?.picpath ?? ''} ${record?.name ?? ''}`.toLowerCase();
  if (/(strike|airstrike|missile|drone|shahed|attack)/.test(keywords)) return 'airstrike';
  if (/(fire|burn|blaze|smoke)/.test(keywords)) return 'fire';
  if (/(explosion|blast)/.test(keywords)) return 'explosion';
  if (/(blockade|road|checkpoint|obstruction)/.test(keywords)) return 'blockade';
  if (/(protest|unrest|demonstration)/.test(keywords)) return 'unrest';
  return 'military_activity';
}

function normalizeVenueSubType(record) {
  return normalizeText(record?.picpath ?? record?.keywords ?? normalizeVenueEventType(record), normalizeVenueEventType(record));
}

function toRawEvent(record, fetchedAt, index = 0) {
  const coordinates = normalizeCoordinates(record);
  if (!coordinates) {
    return null;
  }

  const title = normalizeText(candidateValue(record, ['title', 'headline']), 'Liveuamap event');
  const description = normalizeText(
    candidateValue(record, ['description', 'summary', 'text', 'excerpt']),
    title,
  );

  return {
    source: 'liveuamap',
    sourceEventId: normalizeSourceEventId(record, index),
    sourceUrl: normalizeText(candidateValue(record, ['url', 'link']), process.env.LIVEUAMAP_BASE_URL ?? ''),
    title,
    description,
    eventType: normalizeEventType(record),
    eventSubType: normalizeEventSubType(record),
    lat: coordinates.lat,
    lng: coordinates.lng,
    locationName: normalizeLocationName(record),
    country: normalizeCountry(record),
    reportedAt: normalizeDate(candidateValue(record, ['reportedAt', 'published_at', 'timestamp', 'time', 'date'])),
    fetchedAt,
    rawPayload: record,
    processingStatus: 'pending',
  };
}

function venueToRawEvent(record, fetchedAt, index = 0) {
  const lat = Number(record?.lat);
  const lng = Number(record?.lng);
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  const sourceUrl = normalizeText(record?.link ?? record?.source, process.env.LIVEUAMAP_BASE_URL ?? '');
  return {
    source: 'liveuamap',
    sourceEventId: String(record?.id ?? `liveuamap-venue-${Date.now()}-${index}`),
    sourceUrl,
    title: normalizeText(record?.name, 'Liveuamap event'),
    description: normalizeText(record?.description ?? record?.udescription ?? record?.name, record?.name ?? 'Liveuamap event'),
    eventType: normalizeVenueEventType(record),
    eventSubType: normalizeVenueSubType(record),
    lat,
    lng,
    locationName: normalizeText(record?.location ?? record?.name, 'Unknown location'),
    country: normalizeText(process.env.LIVEUAMAP_REGION, 'Unknown'),
    reportedAt: normalizeDate(record?.timestamp ? Number(record.timestamp) * 1000 : record?.time),
    fetchedAt,
    rawPayload: {
      ...record,
      sourceMode: 'html-embedded',
    },
    processingStatus: 'pending',
  };
}

function extractEmbeddedVenues(html) {
  const match = String(html ?? '').match(/var\s+ovens\s*=\s*'([^']+)'/);
  if (!match) {
    return { venues: [], errors: [] };
  }

  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const venues = Array.isArray(parsed?.venues) ? parsed.venues : [];
    return { venues, errors: [] };
  } catch (error) {
    return {
      venues: [],
      errors: [`Failed to decode embedded Liveuamap feed payload: ${error.message}`],
    };
  }
}

export function parseApiResponseToRawEvents(payload, fetchedAt = new Date()) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data?.items
      ?? payload?.data?.events
      ?? payload?.data
      ?? payload?.events
      ?? payload?.items
      ?? payload?.features
      ?? [];

  if (!Array.isArray(items)) {
    return { rawEvents: [], errors: ['Liveuamap API payload did not contain an event array.'] };
  }

  const rawEvents = [];
  const errors = [];

  items.forEach((item, index) => {
    const rawEvent = toRawEvent(item, fetchedAt, index);
    if (!rawEvent) {
      errors.push(`Skipped API item at index ${index} because coordinates were missing or invalid.`);
      return;
    }
    rawEvents.push(rawEvent);
  });

  return { rawEvents, errors };
}

function htmlEventCandidates($) {
  return [
    '.event',
    '.event-card',
    '.feed-item',
    '.news-item',
    '[data-lat][data-lng]',
  ]
    .flatMap((selector) => $(selector).toArray())
    .filter((element, index, array) => array.indexOf(element) === index);
}

function parseHtmlElement($, element, fetchedAt, index = 0) {
  const node = $(element);
  const lat = Number(
    node.attr('data-lat')
    ?? node.attr('data-latitude')
    ?? node.find('[data-lat]').first().attr('data-lat')
    ?? node.find('[data-latitude]').first().attr('data-latitude'),
  );
  const lng = Number(
    node.attr('data-lng')
    ?? node.attr('data-lon')
    ?? node.attr('data-longitude')
    ?? node.find('[data-lng]').first().attr('data-lng')
    ?? node.find('[data-lon]').first().attr('data-lon')
    ?? node.find('[data-longitude]').first().attr('data-longitude'),
  );

  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  const title = normalizeText(
    node.find('h1, h2, h3, .title, .headline').first().text(),
    normalizeText(node.text(), 'Liveuamap event'),
  );
  const description = normalizeText(
    node.find('p, .summary, .description, .excerpt').first().text(),
    title,
  );
  const href = node.find('a[href]').first().attr('href');
  const timestamp = node.attr('data-time')
    ?? node.find('time').attr('datetime')
    ?? node.find('.time, .timestamp, .date').first().text();
  const eventType = normalizeText(node.attr('data-type') ?? node.attr('data-category'), 'military_activity');
  const eventSubType = normalizeText(node.attr('data-subtype') ?? eventType, eventType);
  const sourceEventId = node.attr('data-id')
    ?? node.attr('id')
    ?? href
    ?? `html-liveuamap-${Date.now()}-${index}`;

  return {
    source: 'liveuamap',
    sourceEventId: String(sourceEventId),
    sourceUrl: normalizeText(href, process.env.LIVEUAMAP_BASE_URL ?? ''),
    title,
    description,
    eventType,
    eventSubType,
    lat,
    lng,
    locationName: normalizeText(node.attr('data-location') ?? title, 'Unknown location'),
    country: normalizeText(node.attr('data-country') ?? process.env.LIVEUAMAP_REGION, 'Unknown'),
    reportedAt: normalizeDate(timestamp),
    fetchedAt,
    rawPayload: {
      html: true,
      title,
      description,
      href,
      lat,
      lng,
      eventType,
      eventSubType,
    },
    processingStatus: 'pending',
  };
}

export function parseHtmlToRawEvents(html, fetchedAt = new Date()) {
  const embedded = extractEmbeddedVenues(html);
  if (embedded.venues.length) {
    const rawEvents = [];
    const errors = [...embedded.errors];

    embedded.venues.forEach((venue, index) => {
      const rawEvent = venueToRawEvent(venue, fetchedAt, index);
      if (!rawEvent) {
        errors.push(`Skipped embedded venue at index ${index} because coordinates were missing or invalid.`);
        return;
      }
      rawEvents.push(rawEvent);
    });

    return { rawEvents, errors };
  }

  const $ = cheerio.load(String(html ?? ''));
  const elements = htmlEventCandidates($);
  const rawEvents = [];
  const errors = [...embedded.errors];

  elements.forEach((element, index) => {
    const rawEvent = parseHtmlElement($, element, fetchedAt, index);
    if (!rawEvent) {
      errors.push(`Skipped HTML item at index ${index} because coordinates were missing or invalid.`);
      return;
    }
    rawEvents.push(rawEvent);
  });

  return { rawEvents, errors };
}

export function getMockLiveuamapRawEvents(fetchedAt = new Date()) {
  const mockRecords = [
    {
      id: 'liveuamap-mock-001',
      title: 'Artillery impact reported near north evacuation corridor',
      description: 'Open-source field reporting indicates recent artillery impacts near the north corridor approach.',
      type: 'artillery',
      subtype: 'shelling',
      lat: 40.7445,
      lng: -73.9994,
      country: 'USA',
      locationName: 'North Corridor',
      reportedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      url: 'https://liveuamap.example/mock/1',
    },
    {
      id: 'liveuamap-mock-002',
      title: 'Checkpoint congestion and military movement observed',
      description: 'Vehicle movement and checkpoint congestion reported along the west approach road.',
      type: 'military_activity',
      subtype: 'checkpoint_activity',
      lat: 40.7529,
      lng: -73.9774,
      country: 'USA',
      locationName: 'West Approach',
      reportedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      url: 'https://liveuamap.example/mock/2',
    },
    {
      id: 'liveuamap-mock-003',
      title: 'Smoke plume visible near industrial edge of evacuation sector',
      description: 'Residents reported a growing smoke plume near the industrial edge of the east sector.',
      type: 'fire',
      subtype: 'industrial_fire',
      lat: 40.7361,
      lng: -73.9657,
      country: 'USA',
      locationName: 'East Sector',
      reportedAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
      url: 'https://liveuamap.example/mock/3',
    },
    {
      id: 'liveuamap-mock-004',
      title: 'Road obstruction reported near civic shelter route',
      description: 'A sudden road obstruction was reported near a primary civic shelter approach.',
      type: 'blockade',
      subtype: 'road_obstruction',
      lat: 40.7482,
      lng: -73.9865,
      country: 'USA',
      locationName: 'Civic Shelter Route',
      reportedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      url: 'https://liveuamap.example/mock/4',
    },
  ];

  return mockRecords.map((record, index) => ({
    ...toRawEvent({ ...record, rawPayload: undefined }, fetchedAt, index),
    rawPayload: { ...record, mock: true },
  }));
}
