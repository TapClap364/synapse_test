import OpenAI from 'openai';
import { HttpError } from './errors';

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const key = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new HttpError(500, 'AI provider not configured (OPENROUTER_API_KEY or OPENAI_API_KEY missing)');
  }
  cached = new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
    defaultHeaders: process.env.OPENROUTER_API_KEY
      ? {
          'HTTP-Referer': process.env.PUBLIC_APP_URL ?? 'https://synapse-project-chi.vercel.app',
          'X-Title': 'Synapse AI',
        }
      : undefined,
    timeout: 60_000,
    maxRetries: 1,
  });
  return cached;
}

export const AI_MODEL = process.env.OPENROUTER_API_KEY
  ? 'meta-llama/llama-3.3-70b-instruct'
  : 'gpt-4o-mini';

/**
 * Safely parse a JSON response from the LLM.
 * Returns null on parse failure (caller should handle gracefully).
 */
export function safeParseAiJson<T = unknown>(content: string | null | undefined): T | null {
  if (!content) return null;
  // Strip code fences if the model wrapped it (despite response_format=json_object)
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
