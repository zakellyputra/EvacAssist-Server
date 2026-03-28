import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a road passability and hazard detection system analyzing images.
Respond with ONLY valid JSON matching this exact schema:
{
  "flood_detected": boolean,
  "fire_detected": boolean,
  "smoke_detected": boolean,
  "road_debris": boolean,
  "bridge_damage": boolean,
  "building_collapse": boolean,
  "military_vehicles": boolean,
  "crowd_density": one of [none, low, medium, high],
  "vehicle_passable": one of [true, false, "maybe"],
  "pedestrian_passable": one of [true, false, "maybe"],
  "estimated_flood_depth": one of [none, shallow, moderate, deep],
  "severity": float 0.0–1.0 overall threat level,
  "confidence": float 0.0–1.0 reflecting image clarity and certainty
}`;

/**
 * Analyze an image and return passability/hazard signals.
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} mediaType - e.g. "image/jpeg"
 * @param {{ lat: number, lng: number }} coordinates - Location where image was captured
 * @returns {Promise<object>} Structured passability signal for geo-fusion
 */
export async function parseImage(imageBase64, mediaType, coordinates) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Analyze this image for road hazards and passability.',
          },
        ],
      },
    ],
  });

  const parsed = JSON.parse(response.content[0].text.trim());

  // Derive event_type from VLM output
  const event_type = deriveEventType(parsed);

  return {
    ...parsed,
    source_type: 'image',
    event_type,
    source_weight: 0.95, // image-confirmed evidence
    coordinates,
    radius_m: 200, // images are highly localized
    expires_at: new Date(Date.now() + 4 * 3_600_000), // 4-hour default decay
  };
}

function deriveEventType(signal) {
  if (signal.flood_detected) return 'flood';
  if (signal.fire_detected || signal.smoke_detected) return 'fire';
  if (signal.bridge_damage || signal.building_collapse) return 'infrastructure_damage';
  if (signal.road_debris || signal.vehicle_passable === false) return 'road_block';
  if (signal.military_vehicles) return 'checkpoint';
  if (signal.crowd_density === 'high') return 'crowd';
  return 'unknown';
}
