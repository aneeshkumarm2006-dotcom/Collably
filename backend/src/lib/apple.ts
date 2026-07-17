/**
 * Sign in with Apple verification (App Store Guideline 4.8).
 *
 * The iOS app obtains an `identityToken` (a signed JWT) from Apple natively and
 * posts it to `POST /api/auth/apple`; this module verifies that token's signature
 * against Apple's published public keys and checks its audience/issuer, then
 * returns the trusted claims.
 *
 * No Apple client secret / .p8 key is needed for this flow — that's only required
 * for the *web* flow and token revocation. For a native app we verify the token's
 * signature against Apple's JWKS and assert `aud === <our bundle id>`, which is
 * what proves the token was minted for this app.
 */
import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from './env';
import { AppError } from '../middleware/errorHandler';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
/** Re-fetch the key set at most this often; Apple rotates keys rarely. */
const JWKS_TTL_MS = 60 * 60_000;

/** A JSON Web Key as published by Apple. */
type AppleJwk = { kid: string; kty: string; alg: string; use: string; n: string; e: string };

let jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

/** Fetch (and cache) Apple's public keys. `force` bypasses the cache on an unknown kid. */
async function getAppleKeys(force = false): Promise<AppleJwk[]> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh && !force) return jwksCache!.keys;

  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) throw new AppError(503, 'Could not reach Apple to verify your sign-in');
  const data = (await res.json()) as { keys?: AppleJwk[] };
  if (!data.keys?.length) throw new AppError(503, 'Apple returned no signing keys');

  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

/** Find the key matching a token's `kid`, refetching once if it's unknown (rotation). */
async function keyForKid(kid: string): Promise<AppleJwk> {
  let keys = await getAppleKeys();
  let jwk = keys.find((k) => k.kid === kid);
  if (!jwk) {
    // Unknown kid usually means Apple rotated keys — refetch once before failing.
    keys = await getAppleKeys(true);
    jwk = keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new AppError(401, 'Your Apple sign-in could not be verified');
  return jwk;
}

/** The subset of verified Apple claims we use to find-or-create a user. */
export interface AppleProfile {
  /** Apple's stable subject id for (this user, this app). */
  appleId: string;
  /** May be a private relay address when the user chose "Hide My Email". */
  email?: string;
  emailVerified: boolean;
}

/**
 * Verify an Apple identity token and return its claims. Throws 401 if the token is
 * invalid, expired, or wasn't issued for this app.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleProfile> {
  const decoded = jwt.decode(identityToken, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) throw new AppError(401, 'Your Apple sign-in could not be verified');

  const jwk = await keyForKid(kid);
  // Node can build a public key straight from a JWK — no extra JWKS dependency.
  const publicKey = crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: 'jwk' });

  let payload: JwtPayload;
  try {
    payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      // The audience MUST be our bundle id — this is what ties the token to this app.
      audience: env.apple.bundleId,
    }) as JwtPayload;
  } catch {
    throw new AppError(401, 'Your Apple sign-in has expired or is invalid');
  }

  const appleId = typeof payload.sub === 'string' ? payload.sub : '';
  if (!appleId) throw new AppError(401, 'Your Apple sign-in could not be verified');

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  // Apple sends email_verified as either a boolean or the string "true".
  const rawVerified = (payload as { email_verified?: boolean | string }).email_verified;
  const emailVerified = rawVerified === true || rawVerified === 'true';

  return { appleId, email, emailVerified };
}
