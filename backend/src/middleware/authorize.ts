/**
 * Role-based authorization guards (PRD §6 permission matrix). Mount *after*
 * `authenticate` so `req.user` is set. The factory builds a guard for any set of
 * allowed roles; the named exports cover the common cases.
 *
 *   router.post('/campaigns', authenticate, businessOnly, createCampaign);
 */
import type { RequestHandler } from 'express';
import { AppError } from './errorHandler';
import type { UserRole } from '../../../shared/constants/statuses';

/** Build a guard that allows only the given role(s). */
export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      // Programmer error: authorize ran without authenticate in front of it.
      throw new AppError(401, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}

export const businessOnly = authorize('business');
export const creatorOnly = authorize('creator');
export const adminOnly = authorize('admin');
