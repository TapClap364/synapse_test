import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getStripe } from './_lib/stripe.js';
import { HttpError } from './_lib/errors.js';

const InputSchema = z.object({
  priceId: z.string().min(1).max(200),
  successPath: z.string().max(500).optional().default('/billing/success'),
  cancelPath: z.string().max(500).optional().default('/billing/cancel'),
});

const APP_URL = process.env.PUBLIC_APP_URL ?? 'https://synapse-project-chi.vercel.app';

export default createHandler(
  { method: 'POST', schema: InputSchema, requireWrite: true, rateLimit: 'default' },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();
    const stripe = getStripe();

    // Only owners can manage billing
    if (auth.role !== 'owner') {
      throw new HttpError(403, 'Only workspace owners can manage billing');
    }

    // Look up or create the Stripe Customer for this workspace
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id, name, stripe_customer_id')
      .eq('id', auth.workspaceId)
      .maybeSingle();
    if (wsErr || !ws) throw new HttpError(404, 'Workspace not found');

    let customerId = ws.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.email,
        name: ws.name,
        metadata: { workspace_id: ws.id },
      });
      customerId = customer.id;
      await supabase
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', ws.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: body.priceId, quantity: 1 }],
      success_url: `${APP_URL}${body.successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}${body.cancelPath}`,
      client_reference_id: auth.workspaceId,
      subscription_data: {
        metadata: { workspace_id: auth.workspaceId },
      },
      metadata: { workspace_id: auth.workspaceId, user_id: auth.userId },
    });

    res.status(200).json({ url: session.url, session_id: session.id });
  }
);
