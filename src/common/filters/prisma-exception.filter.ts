import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request?.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Unique constraint failed';
        break;

      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;

      default:
        // Unrecognized code = a real DB fault we can't map to a client error.
        // Surface it as 500 (not 400) and make it visible to logs + Sentry —
        // this filter takes precedence over SentryGlobalFilter for Prisma
        // errors, so without this the fault would be invisible (M7).
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database error';
        this.logger.error(
          `Unhandled Prisma error ${exception.code} on ${request?.method} ${request?.url} (rid=${requestId}): ${exception.message}`,
        );
        Sentry.captureException(exception, {
          level: 'error',
          tags: { area: 'prisma', prisma_code: exception.code },
          extra: { path: request?.url, requestId },
        });
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      path: request?.url,
      timestamp: new Date().toISOString(),
    });
  }
}
