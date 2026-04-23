import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ZodSchema, infer as zInfer } from 'zod';
import { applyCors } from './cors';
import { verifyAuth, requireWriteAccess, AuthContext } from './auth';
import { enforceRateLimit, LimiterKind } from './ratelimit';
import { initSentry, captureError } from './sentry';
import { HttpError } from './errors';

interface HandlerOptions<S extends ZodSchema | undefined> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  schema?: S;
  rateLimit?: LimiterKind;
  /** If true, require role in (owner, admin, member). Default false (read access OK). */
  requireWrite?: boolean;
  /** If true, skip auth (use only for public endpoints like Stripe webhooks). */
  skipAuth?: boolean;
}

type Body<S> = S extends ZodSchema ? zInfer<S> : unknown;

interface HandlerCtx<S extends ZodSchema | undefined> {
  req: VercelRequest;
  res: VercelResponse;
  auth: AuthContext;
  body: Body<S>;
}

interface PublicHandlerCtx {
  req: VercelRequest;
  res: VercelResponse;
}

export function createHandler<S extends ZodSchema | undefined = undefined>(
  opts: HandlerOptions<S>,
  fn: (ctx: HandlerCtx<S>) => Promise<unknown> | unknown
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    initSentry();
    if (applyCors(req, res)) return;

    try {
      if (opts.method && req.method !== opts.method) {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      let auth: AuthContext;
      if (opts.skipAuth) {
        auth = { userId: '', email: '', workspaceId: '', role: 'viewer' };
      } else {
        auth = await verifyAuth(req);
        if (opts.requireWrite) requireWriteAccess(auth);
      }

      if (opts.rateLimit) {
        const key = opts.skipAuth ? `ip:${getClientIp(req)}` : `user:${auth.userId}`;
        await enforceRateLimit(key, opts.rateLimit);
      }

      let body: Body<S>;
      if (opts.schema) {
        const parsed = opts.schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: 'Invalid input',
            details: parsed.error.flatten(),
          });
        }
        body = parsed.data as Body<S>;
      } else {
        body = req.body as Body<S>;
      }

      await fn({ req, res, auth, body });
    } catch (err) {
      handleError(err, req, res);
    }
  };
}

/** Public handler (no auth, no schema). For Stripe webhooks etc. */
export function createPublicHandler(
  opts: { method?: HandlerOptions<undefined>['method']; rateLimit?: LimiterKind },
  fn: (ctx: PublicHandlerCtx) => Promise<unknown> | unknown
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    initSentry();
    if (applyCors(req, res)) return;
    try {
      if (opts.method && req.method !== opts.method) {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (opts.rateLimit) {
        await enforceRateLimit(`ip:${getClientIp(req)}`, opts.rateLimit);
      }
      await fn({ req, res });
    } catch (err) {
      handleError(err, req, res);
    }
  };
}

function handleError(err: unknown, req: VercelRequest, res: VercelResponse): void {
  if (err instanceof HttpError) {
    return void res.status(err.status).json({ error: err.message, details: err.details });
  }
  captureError(err, { url: req.url, method: req.method });
  console.error('[api-error]', err);
  return void res.status(500).json({ error: 'Internal server error' });
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
  return 'unknown';
}
