/**
 * Small request-parsing helpers shared across the Phase 6 routes: ObjectId
 * validation for `:id` params and a consistent pagination contract.
 */
import { Types } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

/**
 * Validate a route param is a well-formed Mongo ObjectId and return it. Throws a
 * 400 (not 404) for a malformed id so a typo'd URL is distinguishable from a
 * valid-but-missing document.
 */
export function objectIdParam(value: string | undefined, name = 'id'): string {
  if (!value || !Types.ObjectId.isValid(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

/** Largest page size a client may request; bigger values are clamped down. */
export const MAX_PAGE_LIMIT = 50;

/**
 * Zod schema for `?page=&limit=`. An out-of-range `limit` is *clamped* (not
 * rejected) so an over-eager client gets a capped page instead of a 400; a
 * non-numeric value falls back to the default.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .catch(20)
    .default(20)
    .transform((n) => Math.min(MAX_PAGE_LIMIT, Math.max(1, n))),
});

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

/** Parse + clamp pagination query params into `{ page, limit, skip }`. */
export function parsePagination(query: unknown): Pagination {
  const { page, limit } = paginationSchema.parse(query);
  return { page, limit, skip: (page - 1) * limit };
}

/** Standard paginated list envelope: `{ data, page, limit, total, totalPages }`. */
export function paginated<T>(data: T[], total: number, { page, limit }: Pagination) {
  return { data, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
