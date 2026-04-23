import Stripe from 'stripe';
import { HttpError } from './errors';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new HttpError(500, 'Stripe is not configured (STRIPE_SECRET_KEY missing)');
  }
  // Use the SDK's pinned default API version (don't override).
  cached = new Stripe(key);
  return cached;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
