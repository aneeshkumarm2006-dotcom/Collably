/**
 * Report-filing route (PRD §14). Any signed-in user can report a campaign,
 * business, or creator; the report lands in the admin Reports queue
 * (`/api/admin/reports`). Admins act on them there — this router only files.
 *
 *   POST /api/reports   file a moderation report
 */
import { Router } from 'express';
import { z } from 'zod';
import { Report } from '../models/Report';
import { REPORT_TARGET_TYPES } from '../../../shared/constants/reports';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { objectIdParam } from '../lib/http';
import { toPublicReport } from '../lib/serialize';

const router = Router();

const fileSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string(),
  reason: z.string().trim().min(1, 'reason is required').max(2000),
});

/** POST /api/reports — file a report against a campaign/business/creator/user. */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason } = fileSchema.parse(req.body);
    const report = await Report.create({
      reporterId: req.user!._id,
      targetType,
      targetId: objectIdParam(targetId, 'targetId'),
      reason,
    });
    res.status(201).json({ report: toPublicReport(report) });
  }),
);

export default router;
