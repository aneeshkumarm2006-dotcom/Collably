/**
 * Push-token routes (PRD §9.1, §18). The app registers its Expo push token on
 * open after login and removes it on logout, so the server only ever pushes to
 * live devices.
 *
 *   POST   /api/push/register   save/update the caller's Expo push token
 *   DELETE /api/push/token      clear the caller's push token (logout)
 */
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { isExpoPushToken } from '../services';

const router = Router();

const registerSchema = z.object({
  pushToken: z.string().trim().min(1, 'pushToken is required'),
});

/** POST /api/push/register — persist the Expo push token on the user. */
router.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const { pushToken } = registerSchema.parse(req.body);
    if (!isExpoPushToken(pushToken)) {
      throw new AppError(400, 'Not a valid Expo push token');
    }

    await User.updateOne({ _id: req.user!._id }, { pushToken });
    res.status(200).json({ registered: true });
  }),
);

/** DELETE /api/push/token — remove the push token (called on logout). */
router.delete(
  '/token',
  authenticate,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user!._id }, { pushToken: null });
    res.status(200).json({ removed: true });
  }),
);

export default router;
