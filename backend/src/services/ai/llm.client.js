import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * The only place in the codebase that talks to an LLM provider. The API key
 * lives in the backend environment and never reaches the browser.
 */
export function isAiEnabled() {
  return env.ai.enabled;
}

export async function complete({ system, messages, maxTokens, temperature = 0 }) {
  if (!isAiEnabled()) {
    throw ApiError.serviceUnavailable(
      'The AI features are switched off. Add ANTHROPIC_API_KEY to the backend environment to turn them on.',
    );
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ai.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ai.model,
        max_tokens: maxTokens || env.ai.maxTokens,
        temperature,
        system,
        messages,
      }),
    });
  } catch {
    throw ApiError.serviceUnavailable('Could not reach the AI service');
  }

  if (!response.ok) {
    const body = await response.text();
    console.error('LLM error', response.status, body.slice(0, 500));
    throw ApiError.serviceUnavailable('The AI service returned an error');
  }

  const data = await response.json();
  return (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Parses a model reply that is meant to be JSON, tolerating code fences. */
export function parseJsonReply(text) {
  const cleaned = text
    .replace(/^```(?:json)?/gm, '')
    .replace(/```$/gm, '')
    .trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw ApiError.unprocessable('The AI reply could not be read');
  try {
    return JSON.parse(cleaned.slice(start));
  } catch {
    throw ApiError.unprocessable('The AI reply could not be read');
  }
}
