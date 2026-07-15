/**
 * Core of the Instagram DM-code flow: what happens when a "hi" DM arrives.
 *
 * Shared by the real Meta webhook and the dev-simulate route, so both drive the exact
 * same state transition. Matching the DM sender's username to the claimed handle is
 * the ownership proof — only the real owner can DM from that account.
 */
import { InstagramVerification } from '../models/InstagramVerification';
import { generateOtp, hashOtp } from './otp';
import { sendInstagramDm } from '../services';
import { env } from './env';
import type { InstagramProfile } from '../services';

/**
 * Process an inbound DM from `igsid` whose sender profile is `profile`. If it matches
 * a creator's pending (`awaiting_dm`) session, mint a code, DM it back, and move the
 * session to `code_sent`. Returns the plaintext code so the *dev-simulate* caller can
 * surface it (the real webhook ignores it — the code goes out over the DM instead).
 *
 * Returns null when no pending session matches (an unrelated DM, or a handle mismatch).
 */
export async function handleInstagramDm(
  igsid: string,
  profile: InstagramProfile,
): Promise<string | null> {
  const session = await InstagramVerification.findOne({
    claimedHandle: profile.username,
    status: 'awaiting_dm',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!session) return null;

  const code = generateOtp();
  session.igsid = igsid;
  session.igUsername = profile.username;
  session.followerCount = profile.followerCount;
  session.codeHash = hashOtp(code);
  session.status = 'code_sent';
  await session.save();

  // DM the code back (best-effort; in dev this is a no-op and the caller exposes it).
  await sendInstagramDm(
    igsid,
    `${code} is your LocalShout verification code. It expires in ${env.otpTtlMinutes} minutes.`,
  );

  return code;
}
