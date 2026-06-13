/**
 * Notification routes (PRD §9.3, §18). The signed-in user's in-app notification
 * feed and a "mark all read" action driving the unread badge.
 *
 *   GET   /api/notifications        newest-first feed (+ unread count), paginated
 *   PATCH /api/notifications/read   mark all of the user's notifications read
 */
import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { Notification, type NotificationDoc } from '../models/Notification';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { parsePagination, paginated } from '../lib/http';
import { toPublicNotification } from '../lib/serialize';

const router = Router();

const listQuerySchema = z.object({
  unread: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

/** GET /api/notifications — the user's feed, newest first, with an unread count. */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { unread } = listQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);

    const filter: FilterQuery<NotificationDoc> = { userId: req.user!._id };
    if (unread) filter.isRead = false;

    const [docs, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user!._id, isRead: false }),
    ]);

    res.status(200).json({
      ...paginated(docs.map(toPublicNotification), total, pagination),
      unreadCount,
    });
  }),
);

/** PATCH /api/notifications/read — mark every notification of the user read. */
router.patch(
  '/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
      { userId: req.user!._id, isRead: false },
      { isRead: true },
    );
    res.status(200).json({ updated: result.modifiedCount, unreadCount: 0 });
  }),
);

export default router;
