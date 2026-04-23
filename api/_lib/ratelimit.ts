import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { HttpError } from './errors.js';

let limiter: Ratelimit | null = null;
let aiLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return Redis.fromEnv();
}

function getDefaultLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const redis = getRedis();
  if (!redis) return null;
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'synapse:default',
  });
  return limiter;
}

function getAiLimiter(): Ratelimit | null {
  if (aiLimiter) return aiLimiter;
  const redis = getRedis();
  if (!redis) return null;
  aiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, '1 m'),
    analytics: true,
    prefix: 'synapse:ai',
  });
  return aiLimiter;
}

export type LimiterKind = 'default' | 'ai';

/**
 * Enforce a rate limit. If Upstash is not configured, this is a no-op
 * (logs a warning once per cold start).
 */
let warned = false;
export async function enforceRateLimit(key: string, kind: LimiterKind = 'default'): Promise<void> {
  const l = kind === 'ai' ? getAiLimiter() : getDefaultLimiter();
  if (!l) {
    if (!warned) {
      console.warn('[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not configured — rate limiting disabled');
      warned = true;
    }
    return;
  }
  const result = await l.limit(key);
  if (!result.success) {
    throw new HttpError(429, 'Rate limit exceeded', {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });
  }
}
