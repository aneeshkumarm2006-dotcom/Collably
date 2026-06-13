/**
 * Google Sign-In verification (PRD §7.1). The mobile app obtains a Google ID
 * token via `expo-auth-session` and posts it to `POST /api/auth/google`; the
 * server verifies the token's signature and audience against Google's public
 * keys (handled locally by `google-auth-library`, no per-request network call to
 * a tokeninfo endpoint) and returns the trusted profile claims.
 */
import { OAuth2Client } from 'google-auth-library';
import { env } from './env';
import { AppError } from '../middleware/errorHandler';

/** The subset of verified Google claims we use to find-or-create a user. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

// One client instance; the audience (web client id) is checked per-verify call.
const client = new OAuth2Client();

/**
 * Verify a Google ID token and return its profile claims. Throws a 401
 * `AppError` if the token is invalid/expired, or a 500 if `GOOGLE_CLIENT_ID`
 * isn't configured.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.googleClientId) {
    throw new AppError(500, 'GOOGLE_CLIENT_ID is not configured on the server');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Invalid Google token');
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, 'Google token is missing required profile fields');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
}
