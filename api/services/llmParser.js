import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an emergency incident extraction system.
Given a text report, extract a structured JSON incident object.
Respond with ONLY valid JSON matching this exact schema:
{
  "event_type": one of [armed_clash, infrastructure_damage, fire, flood, road_block, crowd, checkpoint, unknown],
  "location_text": "human-readable location description",
  "coordinates": { "lat": number, "lng": number } or null if unresolvable,
  "radius_m": estimated affected radius in meters,
  "severity": float 0.0–1.0,
  "road_block_prob": float 0.0–1.0,
  "directional_effect": string or null,
  "time_decay_hours": how many hours until this is likely resolved,
  "confidence": float 0.0–1.0 reflecting how certain you are,
  "affected_infrastructure": array of strings
}
If coordinates cannot be determined from context, set coordinates to null.`;

/**
 * Parse a raw text report into a structured incident object.
 * @param {string} text - Raw report text (news, SMS, user report, NGO alert)
 * @param {number} sourceWeight - Reliability weight for this source type (0–1)
 * @returns {Promise<object>} Structured incident ready for geo-fusion
 */
export async function parseTextReport(text, sourceWeight = 0.5) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  });

  const raw = response.content[0].text.trim();
  const parsed = JSON.parse(raw);

  return {
    ...parsed,
    source_type: 'text',
    source_weight: sourceWeight,
    expires_at: new Date(Date.now() + parsed.time_decay_hours * 3_600_000),
  };
}

// Source weight constants — import these when calling parseTextReport
export const SOURCE_WEIGHTS = {
  anonymous: 0.30,
  user_report: 0.50,
  ngo_alert: 0.80,
  operator: 0.90,
};
