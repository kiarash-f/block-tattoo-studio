import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

const logger = new Logger('EmailDelivery');

/**
 * Shared failure handler for fire-and-forget transactional email sends (M14).
 *
 * Transactional emails are dispatched post-commit and not awaited, so a send
 * failure must never break the request — but it must not vanish either.
 * Returns a `.catch` handler that logs the error and reports it to Sentry with
 * `area: 'email'` plus any caller-supplied context (e.g. the booking id), so a
 * client who never received their consult date or cancellation is traceable.
 *
 * Usage: `emailPromise.catch(reportEmailFailure('consult confirmation', { bookingRequestId }))`
 */
export function reportEmailFailure(
  description: string,
  extra?: Record<string, unknown>,
): (err: unknown) => void {
  return (err: unknown) => {
    logger.error(
      `Failed to send ${description}`,
      err instanceof Error ? err.stack : String(err),
    );
    Sentry.captureException(err, {
      level: 'error',
      tags: { area: 'email' },
      extra: { description, ...extra },
    });
  };
}
