// Augments Express' Request with the correlation id attached by
// requestLoggingMiddleware (M17). Read by the Prisma exception filter.
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export {};
