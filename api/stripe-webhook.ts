import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { getStripe, STRIPE_WEBHOOK_SECRET } from './_lib/stripe.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { initSentry, captureError } from './_lib/sentry.js';

// Stripe requires the raw body to verify the signature.
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || Array.isArray(sig)) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  const stripe = getStripe();
  const supabase = getServiceSupabase();

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    captureError(err, { stage: 'verify-signature' });
    res.status(400).json({ error: 'Invalid Stripe signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.client_reference_id ?? session.metadata?.workspace_id;
        if (workspaceId && session.subscription) {
          await supabase
            .from('workspaces')
            .update({
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: (session.customer as string) ?? undefined,
              subscription_status: 'active',
              plan: 'pro',
            })
            .eq('id', workspaceId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspace_id;
        const planId = sub.items.data[0]?.price.id ?? 'unknown';
        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
              plan: planId,
            })
            .eq('id', workspaceId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspace_id;
        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              subscription_status: 'canceled',
              plan: 'free',
            })
            .eq('id', workspaceId);
        }
        break;
      }
      default:
        // Other events ignored for now
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    captureError(err, { stage: 'process-event', eventType: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
