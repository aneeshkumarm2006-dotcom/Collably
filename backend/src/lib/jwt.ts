/**
 * JWT issue + verify helpers (PRD §5.7). Two token kinds:
 *   • access  — short-ish lived, sent as `Authorization: Bearer <token>` on every
 *               request and verified by `middleware/authenticate`.
 *   • refresh — longer lived, exchanged at `POST /api/auth/refresh` for a fresh
 *               access token so users stay signed in without re-entering a password.
 *
 * Both are stateless JWTs. They use *different* secrets and carry a `type` claim
 * that is checked on verify, so an access token can never be used where a refresh
 * token is expected (or vice-versa).
 */
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from './env';
import { AppError } from '../middleware/errorHandler';
import type { UserRole } from '../../../shared/constants/statuses';

export type TokenType = 'access' | 'refresh';

/** Decoded, validated claims we put on every token. */
export interface AuthTokenClaims {
  /** User id (standard `sub` claim). */
  sub: string;
  role: UserRole;
  type: TokenType;
}

/** What clients receive on register/login/refresh. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function ensureSecret(secret: string, label: string): string {
  if (!secret) {
    // Misconfiguration, not a client error — surfaces as a 500.
    throw new AppError(500, `${label} is not configured on the server`);
  }
  return secret;
}

function sign(sub: string, role: UserRole, type: TokenType): string {
  const isAccess = type === 'access';
  const secret = isAccess
    ? ensureSecret(env.jwtSecret, 'JWT_SECRET')
    : ensureSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET');
  const options: SignOptions = {
    expiresIn: (isAccess ? env.jwtExpiresIn : env.jwtRefreshExpiresIn) as SignOptions['expiresIn'],
  };
  return jwt.sign({ role, type }, secret, { ...options, subject: sub });
}

/** Sign a single short-lived access token. */
export function signAccessToken(userId: string, role: UserRole): string {
  return sign(userId, role, 'access');
}

/** Sign a single long-lived refresh token. */
export function signRefreshToken(userId: string, role: UserRole): string {
  return sign(userId, role, 'refresh');
}

/** Sign both tokens at once — the usual register/login response. */
export function signTokenPair(userId: string, role: UserRole): TokenPair {
  return {
    accessToken: signAccessToken(userId, role),
    refreshToken: signRefreshToken(userId, role),
  };
}

/**
 * Verify a token of the expected kind and return its claims. Throws a 401
 * `AppError` on any failure (expired, bad signature, wrong type, malformed) so
 * the central error handler renders a clean response.
 */
export function verifyToken(token: string, expected: TokenType): AuthTokenClaims {
  const secret =
    expected === 'access'
      ? ensureSecret(env.jwtSecret, 'JWT_SECRET')
      : ensureSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET');

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  if (typeof decoded === 'string' || !decoded.sub || decoded.type !== expected) {
    throw new AppError(401, 'Invalid or expired token');
  }

  return { sub: String(decoded.sub), role: decoded.role as UserRole, type: expected };
}
