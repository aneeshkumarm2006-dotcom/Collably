/** Small server-side helpers shared across routes/services. */

/** Wrap an async Express handler so thrown/rejected errors reach `next()`. */
import type { RequestHandler } from 'express';

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
