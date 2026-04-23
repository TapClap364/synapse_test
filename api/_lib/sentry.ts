// Sentry is lazy-loaded to avoid breaking cold-start when @sentry/node's
// OpenTelemetry-laden top-level imports fail in Vercel's Node ESM runtime.
// If SENTRY_DSN isn't set, the module is never required at all.

type SentryModule = typeof import('@sentry/node');

let cachedSentry: SentryModule | null = null;
let initialized = false;
let triedInit = false;

async function loadSentry(): Promise<SentryModule | null> {
  if (cachedSentry) return cachedSentry;
  if (triedInit) return null;
  triedInit = true;
  if (!process.env.SENTRY_DSN) return null;
  try {
    cachedSentry = (await import('@sentry/node')) as SentryModule;
    cachedSentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? 'development',
      tracesSampleRate: 0.1,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    });
    initialized = true;
    return cachedSentry;
  } catch (err) {
    console.error('[sentry] dynamic import failed', err);
    return null;
  }
}

/** Synchronous fire-and-forget init kick. Safe to call repeatedly. */
export function initSentry(): void {
  void loadSentry();
}

export function captureError(err: unknown, ctx?: Record<string, unknown>): void {
  if (!initialized || !cachedSentry) {
    console.error('[sentry-not-init]', err, ctx);
    return;
  }
  cachedSentry.captureException(err, ctx ? { extra: ctx } : undefined);
}
