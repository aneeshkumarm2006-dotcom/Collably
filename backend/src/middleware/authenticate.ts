/**
 * JWT authentication middleware (PRD §6, §17). Reads the bearer token, verifies
 * it, loads the user, and attaches `req.user` + `req.auth`. Returns 401 if the
 * token is missing/invalid or the user no longer exists (e.g. deleted account).
 */
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { verifyToken } from '../lib/jwt';
import { AppError } from './errorHandler';
import { asyncHandler } from '../lib/utils';
import { env } from '../lib/env';
import { User, type UserDoc } from '../models/User';

/** Extract a bearer token from the `Authorization` header, if present. */
function bearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Require a valid access token. On success, `req.user` is the live user doc and
 * `req.auth` holds the token claims.
 */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = bearer(req.headers.authorization);
  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  const claims = verifyToken(token, 'access');

  const user = await User.findById(claims.sub);
  if (!user) {
    // Token is valid but the account is gone — treat as unauthenticated.
    throw new AppError(401, 'Account no longer exists');
  }
  if (user.isBanned) {
    // Account banned by an admin (PRD §7.5, §14) — a valid token must not work.
    throw new AppError(403, 'This account has been suspended');
  }

  req.user = user;
  req.auth = claims;
  next();
});

/**
 * Server-to-server admin auth for the Next.js admin dashboard. When the request
 * carries `x-admin-api-key` matching the configured `ADMIN_API_KEY`, resolve an
 * admin context (a real seeded admin if one exists, otherwise a synthetic admin
 * so downstream handlers that read `req.user` don't crash) and proceed. Otherwise
 * delegate to the normal JWT `authenticate`, so the existing in-app admin (mobile)
 * path keeps working. Always pair with `adminOnly` on the route.
 */
export const adminApiKeyOrAuthenticate: RequestHandler = asyncHandler(async (req, res, next) => {
  const key = req.header('x-admin-api-key');
  if (key && env.adminApiKey && key === env.adminApiKey) {
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      req.user = admin;
    } else {
      const syntheticId = new Types.ObjectId('000000000000000000000000');
      req.user = {
        _id: syntheticId,
        id: syntheticId.toString(),
        role: 'admin',
        name: 'Dashboard Admin',
        isBanned: false,
      } as unknown as UserDoc;
    }
    return next();
  }
  return authenticate(req, res, next);
});

/**
 * Optional authentication for guest-accessible routes (PRD §8.6: explore +
 * campaign detail). Attaches `req.user` when a valid token is present, but never
 * rejects the request when it's missing or invalid.
 */
export const optionalAuthenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = bearer(req.headers.authorization);
  if (!token) return next();

  try {
    const claims = verifyToken(token, 'access');
    const user = await User.findById(claims.sub);
    // Banned accounts fall through to guest access rather than being attached.
    if (user && !user.isBanned) {
      req.user = user;
      req.auth = claims;
    }
  } catch {
    // Ignore bad tokens in optional mode — proceed as a guest.
  }
  next();
});
