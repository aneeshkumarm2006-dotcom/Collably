import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../lib/env';

/**
 * Operational error with an HTTP status code. Throw `new AppError(404, '...')`
 * anywhere in a route/service and the central handler turns it into a clean
 * JSON response.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

/** 404 fallback for unmatched routes — runs after all real routes. Deliberately
 * static: echoing the method/URL back is a needless reflection of caller input. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'Route not found'));
};

/**
 * Central error handler. Normalises AppError, Zod validation errors, and
 * unexpected errors into a consistent `{ error: { message, ... } }` shape.
 * Must be registered last, after routes and `notFound`.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation failures → 400 with field issues.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // Anything else is unexpected — log it and return a generic 500.
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[error] unhandled:', err);
  res.status(500).json({
    error: {
      message: env.isProd ? 'Internal server error' : message,
      ...(env.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
};
