const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const SYSTEM_PROMPT = `You are an evacuation dispatch assistant for an admin coordination console.
You are not allowed to assign drivers, resolve alerts, or change any system state.
You may only summarize the current ride context, explain blockers, recommend next operator actions, and draft a concise handoff note.
Return only structured JSON that matches the required schema.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'array',
      items: { type: 'string' },
    },
    topBlockers: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendedActions: {
      type: 'array',
      items: { type: 'string' },
    },
    handoffNote: {
      type: 'string',
    },
    escalationRecommendation: {
      type: 'string',
    },
  },
  required: ['summary', 'topBlockers', 'recommendedActions', 'handoffNote'],
};

function parseResponsePayload(payload) {
  if (payload.output_parsed) return payload.output_parsed;
  if (payload.output_text) return JSON.parse(payload.output_text);

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    ?.find((item) => item.type === 'output_text')
    ?.text;

  if (!text) throw new Error('OpenAI response did not include structured text output');
  return JSON.parse(text);
}

export async function generateRideAssistantResponse({ rideContext, operatorQuestion = '' }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('Missing OpenAI configuration');
    error.status = 503;
    throw error;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          content: [{
            type: 'input_text',
            text: JSON.stringify({
              operatorQuestion,
              rideContext,
            }),
          }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'ride_dispatch_assistant',
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`OpenAI request failed: ${errorBody}`);
    error.status = 502;
    throw error;
  }

  const payload = await response.json();
  return parseResponsePayload(payload);
}

