/**
 * Instagram verification (DM-code flow), mounted at `/api/verify/instagram`.
 *
 * Deliberately NOT under `/api/auth`: the app **polls** `status` while the creator
 * DMs us, and the strict auth rate-limiter would throttle that (and could lock the
 * user out of login). This router sits under the general limiter instead. Per-code
 * brute force is still bounded by the per-session attempt cap.
 *
 *   POST /start          claim a handle, open a session
 *   GET  /status         poll: awaiting_dm → code_sent → verified
 *   POST /confirm        check the DM'd code, stamp the profile verified
 *   POST /dev/simulate   DEV ONLY — stand in for the inbound DM
 */
import { Router } from 'express';
import { z } from 'zod';
import { InstagramVerification } from '../models/InstagramVerification';
import { CreatorProfile } from '../models/CreatorProfile';
import { authenticate } from '../middleware/authenticate';
import { creatorOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { env } from '../lib/env';
import { extractInstagramHandle } from '../services';
import { handleInstagramDm } from '../lib/instagramVerify';
import { verifyOtp } from '../lib/otp';

const router = Router();

// Everything here is the signed-in creator acting on their own account.
router.use(authenticate, creatorOnly);

const startSchema = z.object({
  // Raw: an @handle, a bare handle, or a profile link — normalised below.
  handle: z.string().trim().min(1, 'Enter your Instagram handle').max(200),
});
const confirmSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

/** POST /start — claim a handle, open a session, return the account to DM. */
router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const { handle: raw } = startSchema.parse(req.body);
    const handle = extractInstagramHandle(raw);
    if (!handle) throw new AppError(400, "That doesn't look like a valid Instagram handle");

    // One live session per creator — drop any earlier ones.
    await InstagramVerification.deleteMany({ userId: req.user!._id });
    await InstagramVerification.create({
      userId: req.user!._id,
      claimedHandle: handle,
      status: 'awaiting_dm',
      expiresAt: new Date(Date.now() + env.otpTtlMinutes * 60_000),
    });

    res.status(200).json({ handle, businessHandle: env.instagram.businessHandle, status: 'awaiting_dm' });
  }),
);

/** GET /status — poll the current session state (the app waits on this). */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const session = await InstagramVerification.findOne({ userId: req.user!._id }).sort({ createdAt: -1 });
    if (!session) {
      res.status(200).json({ status: 'none' });
      return;
    }
    res.status(200).json({
      status: session.status,
      handle: session.claimedHandle,
      followerCount: session.followerCount ?? null,
    });
  }),
);

/**
 * POST /dev/simulate — DEV ONLY. Stands in for the inbound DM + Meta profile read
 * while there are no Meta credentials: mints the code and returns it so the UI is
 * testable. Gated to non-prod AND EXPOSE_DEV_OTP, same as the other dev codes.
 */
router.post(
  '/dev/simulate',
  asyncHandler(async (req, res) => {
    if (env.isProd || !env.exposeDevOtp) throw new AppError(404, 'Not found');

    const session = await InstagramVerification.findOne({
      userId: req.user!._id,
      status: 'awaiting_dm',
    }).sort({ createdAt: -1 });
    if (!session) throw new AppError(400, 'Start an Instagram verification first');

    const followerCount = z.coerce.number().int().min(0).catch(4200).parse(req.body?.followerCount);
    const code = await handleInstagramDm(`dev-igsid-${session.id}`, {
      username: session.claimedHandle,
      followerCount,
    });

    res.status(200).json({ simulated: true, devCode: code, followerCount });
  }),
);

/** POST /confirm — check the DM'd code, mark the handle verified, store the count. */
router.post(
  '/confirm',
  asyncHandler(async (req, res) => {
    const { code } = confirmSchema.parse(req.body);
    const session = await InstagramVerification.findOne({
      userId: req.user!._id,
      status: 'code_sent',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session || !session.codeHash) {
      throw new AppError(400, 'This verification has expired — start again');
    }
    if (session.attempts >= env.otpMaxAttempts) {
      await session.deleteOne();
      throw new AppError(400, 'Too many incorrect attempts — start again');
    }
    if (!verifyOtp(code, session.codeHash)) {
      session.attempts += 1;
      await session.save();
      const left = env.otpMaxAttempts - session.attempts;
      const plural = left === 1 ? 'attempt' : 'attempts';
      throw new AppError(400, left > 0 ? `Incorrect code — ${left} ${plural} left` : 'Incorrect code');
    }

    session.status = 'verified';
    session.verifiedAt = new Date();
    session.codeHash = null;
    await session.save();

    // Stamp the verified handle + Meta's follower count onto the creator profile.
    const profile = await CreatorProfile.findOne({ userId: req.user!._id });
    if (profile) {
      profile.socialHandles = profile.socialHandles ?? {};
      profile.socialHandles.instagram = {
        handle: session.claimedHandle,
        link: `https://instagram.com/${session.claimedHandle}`,
        followerCount: session.followerCount ?? profile.socialHandles.instagram?.followerCount,
        engagementRate: profile.socialHandles.instagram?.engagementRate,
        verified: true,
      };
      await profile.save();
    }

    res.status(200).json({
      verified: true,
      handle: session.claimedHandle,
      followerCount: session.followerCount ?? null,
    });
  }),
);

export default router;
