import * as Sentry from '@sentry/nextjs';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    enabled: process.env.NODE_ENV === 'production',
  });

  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
