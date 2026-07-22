import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Correlation id + HTTP access logging (M17).
 *
 * - Reuses an inbound `x-request-id` (so a trace survives across a proxy /
 *   upstream service) or mints a UUID.
 * - Exposes it on `req.requestId` (read by the Prisma exception filter to embed
 *   in error bodies) and echoes it back on the `x-request-id` response header,
 *   so *every* response — success or error — carries the correlation id.
 * - Logs method, path, status, and duration once the response finishes.
 */
const logger = new Logger('HTTP');

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.headers['x-request-id'];
  const requestId =
    (Array.isArray(inbound) ? inbound[0] : inbound)?.trim() ||
    crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const line = `${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(1)}ms rid=${requestId}`;
    if (statusCode >= 500) logger.error(line);
    else if (statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });

  next();
}
