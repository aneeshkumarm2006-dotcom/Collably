/**
 * Saved collabs ("favourites") — the heart on a collab card. Creator-private: a
 * business is never told who saved its campaign, so there is no public count and
 * no business-facing read.
 *
 *   GET    /api/favorites             the creator's saved collabs (campaign joined)
 *   GET    /api/favorites/ids         just the campaign ids — feeds the heart state
 *   POST   /api/favorites/:campaignId save (idempotent)
 *   DELETE /api/favorites/:campaignId unsave (idempotent)
 */
import { Router } from 'express';
import { Favorite } from '../models/Favorite';
import { Campaign } from '../models/Campaign';
import { authenticate } from '../middleware/authenticate';
import { creatorOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import { toPublicFavorite } from '../lib/serialize';
import { resolveCampaignViewer } from '../lib/campaignViewer';

const router = Router();

// Every route here is the signed-in creator's own list.
router.use(authenticate, creatorOnly);

/**
 * GET /api/favorites — saved collabs, newest save first, campaign + business joined.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const filter = { creatorId: req.user!._id };

    const total = await Favorite.countDocuments(filter);
    const docs = await Favorite.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate({ path: 'campaignId', populate: { path: 'businessId' } });

    const viewerFor = await resolveCampaignViewer(req);
    // A campaign deleted since it was saved populates to null — drop those rows
    // rather than returning a favourite that points at nothing.
    const data = docs
      .filter((f) => f.campaignId != null)
      .map((f) => toPublicFavorite(f, viewerFor(f.campaignId as never)));

    res.status(200).json(paginated(data, total, pagination));
  }),
);

/**
 * Most saved ids we'll hand back in one go. The feed only needs these to decide
 * which hearts are filled, and it re-fetches on every home focus — so this is
 * capped rather than unbounded, which would grow with a heavy saver forever.
 */
const MAX_SAVED_IDS = 1000;

/**
 * GET /api/favorites/ids — the saved campaign ids only.
 *
 * The feed needs to know which hearts are filled; fetching the whole saved list
 * (with joined campaigns) just to read its ids would be wasteful, so this stays a
 * cheap id array. Newest saves win if a creator somehow exceeds the cap.
 */
router.get(
  '/ids',
  asyncHandler(async (req, res) => {
    const docs = await Favorite.find({ creatorId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(MAX_SAVED_IDS)
      .select('campaignId');
    res.status(200).json({ ids: docs.map((f) => f.campaignId.toString()) });
  }),
);

/**
 * POST /api/favorites/:campaignId — save. Idempotent: saving twice is a no-op that
 * still returns 200, so a double-tapped heart can't 500.
 */
router.post(
  '/:campaignId',
  asyncHandler(async (req, res) => {
    const campaignId = objectIdParam(req.params.campaignId, 'campaignId');

    // Don't let a creator save an id that isn't a real campaign.
    const exists = await Campaign.exists({ _id: campaignId });
    if (!exists) throw new AppError(404, 'Campaign not found');

    await Favorite.updateOne(
      { creatorId: req.user!._id, campaignId },
      { $setOnInsert: { creatorId: req.user!._id, campaignId } },
      { upsert: true },
    );
    res.status(200).json({ saved: true, campaignId });
  }),
);

/** DELETE /api/favorites/:campaignId — unsave. Idempotent. */
router.delete(
  '/:campaignId',
  asyncHandler(async (req, res) => {
    const campaignId = objectIdParam(req.params.campaignId, 'campaignId');
    await Favorite.deleteOne({ creatorId: req.user!._id, campaignId });
    res.status(200).json({ saved: false, campaignId });
  }),
);

export default router;
