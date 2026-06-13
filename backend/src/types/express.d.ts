/**
 * Ambient augmentation of Express's `Request` so `req.user` / `req.auth` are
 * typed everywhere after `authenticate` runs. `authenticate` populates both;
 * route handlers can assume they're present once mounted behind it.
 */
import type { UserDoc } from '../models/User';
import type { AuthTokenClaims } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      /** The authenticated user document (loaded from the DB by `authenticate`). */
      user?: UserDoc;
      /** The decoded access-token claims (sub, role, type). */
      auth?: AuthTokenClaims;
    }
  }
}

export {};
