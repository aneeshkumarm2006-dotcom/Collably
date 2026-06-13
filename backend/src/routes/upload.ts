/**
 * Upload route (PRD §8.1, §18). Hands the mobile app signed Cloudinary params so
 * it can upload an image directly — the API secret never leaves the server. The
 * actual signing lives in `services/cloudinary`.
 *
 *   POST /api/upload/sign   → signed upload params for a given folder
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { createSignedUpload } from '../services';

const router = Router();

const signSchema = z.object({
  folder: z.enum(['avatars', 'logos', 'campaigns', 'portfolio', 'submissions']).optional(),
  publicId: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

/** POST /api/upload/sign — signed params for a direct-to-Cloudinary upload. */
router.post(
  '/sign',
  authenticate,
  asyncHandler(async (req, res) => {
    const { folder, publicId, tags } = signSchema.parse(req.body);
    // Throws a clean 500 via the central handler if Cloudinary is unconfigured.
    const params = createSignedUpload({ folder, publicId, tags });
    res.status(200).json(params);
  }),
);

export default router;
