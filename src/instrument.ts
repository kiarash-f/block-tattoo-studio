import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : 0;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
});
