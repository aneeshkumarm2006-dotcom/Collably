/**
 * Google Sign-In verification (PRD §7.1). The mobile app obtains a Google ID
 * token via `expo-auth-session` and posts it to `POST /api/auth/google`; the
 * server verifies the token's signature and audience against Google's public
 * keys (handled locally by `google-auth-library`, no per-request network call to
 * a tokeninfo endpoint) and returns the trusted profile claims.
 */
import { OAuth2Client } from 'google-auth-library';
import { googleAudiences } from './env';
import { AppError } from '../middleware/errorHandler';

/** The subset of verified Google claims we use to find-or-create a user. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

// One client instance; the accepted audiences are checked per-verify call.
const client = new OAuth2Client();

/**
 * Verify a Google ID token and return its profile claims. Throws a 401
 * `AppError` if the token is invalid/expired, or a 500 if no Google client IDs
 * are configured.
 *
 * The token is accepted if its `aud` matches ANY configured client ID — the web
 * client (Expo web / admin) or either native client (iOS/Android), since
 * `expo-auth-session` stamps the per-platform client ID as the audience.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new AppError(500, 'Google sign-in is not configured on the server (set GOOGLE_CLIENT_ID)');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: audiences });
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
