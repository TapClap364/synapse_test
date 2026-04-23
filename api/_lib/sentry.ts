import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  initialized = true;
}

export function captureError(err: unknown, ctx?: Record<string, unknown>): void {
  if (!initialized) {
    console.error('[sentry-not-init]', err, ctx);
    return;
  }
  Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
}
