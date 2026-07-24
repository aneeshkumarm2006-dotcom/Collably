/**
 * User blocking (App Store Guideline 1.2 / Play UGC policy). Any signed-in user
 * can block another account; blocking is account-level and cuts contact in both
 * directions (see `areBlocked` in models/Block).
 *
 *   GET    /api/blocks           the caller's blocked accounts
 *   POST   /api/blocks           block a user
 *   DELETE /api/blocks/:userId   unblock a user
 *
 * Unlike reports (which queue for admin review) a block takes effect
 * immediately and needs no moderator — the store policies require the user to be
 * able to protect themselves without waiting on us.
 */
import { Router } from 'express';
import { z } from 'zod';
import { Block } from '../models/Block';
import { User } from '../models/User';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam } from '../lib/http';

const router = Router();

// Blocking is always a signed-in action.
router.use(authenticate);

const blockSchema = z.object({ userId: z.string() });

/** GET /api/blocks — accounts the caller has blocked, newest first. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await Block.find({ blockerId: req.user!._id })
      .sort({ createdAt: -1 })
      .populate('blockedId', 'name avatar role')
      .lean();

    // Populate can yield null if the blocked account has since been deleted —
    // drop those rather than shipping a half-empty row to the settings list.
    const blocks = rows
      .filter((row) => row.blockedId)
      .map((row) => {
        const user = row.blockedId as unknown as {
          _id: unknown;
          name: string;
          avatar?: string | null;
          role: string;
        };
        return {
          userId: String(user._id),
          name: user.name,
          avatar: user.avatar ?? null,
          role: user.role,
          blockedAt: row.createdAt,
        };
      });

    res.status(200).json({ blocks });
  }),
);

/** POST /api/blocks — block a user. Idempotent: re-blocking is a no-op 200. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = blockSchema.parse(req.body);
    const blockedId = objectIdParam(userId, 'userId');
    const blockerId = req.user!._id;

    if (String(blockedId) === String(blockerId)) {
      throw new AppError(400, 'You cannot block yourself');
    }
    if (!(await User.exists({ _id: blockedId }))) {
      throw new AppError(404, 'That account no longer exists');
    }

    // Upsert keeps the action idempotent — tapping Block twice (or on a flaky
    // connection) must not 409 at the unique index.
    await Block.updateOne(
      { blockerId, blockedId },
      { $setOnInsert: { blockerId, blockedId } },
      { upsert: true },
    );

    res.status(200).json({ blocked: true, userId: String(blockedId) });
  }),
);

/** DELETE /api/blocks/:userId — unblock. Idempotent: 200 even if not blocked. */
router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    const blockedId = objectIdParam(req.params.userId, 'userId');
    await Block.deleteOne({ blockerId: req.user!._id, blockedId });
    res.status(200).json({ blocked: false, userId: String(blockedId) });
  }),
);

export default router;
