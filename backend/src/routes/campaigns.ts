/**
 * Campaign routes (PRD §11–§13, §18). Discovery feed, CRUD, status transitions,
 * and the creator "apply" action. Guest-readable list + detail (PRD §8.6);
 * everything that mutates requires auth + the right role.
 *
 *   GET    /api/campaigns            discovery feed: filters + sort + ranking + pagination
 *   POST   /api/campaigns            create (businessOnly)
 *   GET    /api/campaigns/:id        single campaign (+ business)
 *   PUT    /api/campaigns/:id        update (owner only)
 *   DELETE /api/campaigns/:id        delete (owner or admin), cascades applications
 *   PATCH  /api/campaigns/:id/status enforce the PRD §12 status machine (owner only)
 *   POST   /api/campaigns/:id/apply  creator applies (creatorOnly), PRD §11 rules
 */
import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { Campaign, type CampaignDoc } from '../models/Campaign';
import { Application } from '../models/Application';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { CATEGORIES } from '../../../shared/constants/categories';
import { PLATFORMS } from '../../../shared/constants/platforms';
import { CONTENT_TYPES } from '../../../shared/constants/contentTypes';
import { REWARD_TYPES } from '../../../shared/constants/rewards';
import { canTransitionCampaign, type CampaignStatus } from '../../../shared/constants/statuses';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { businessOnly, creatorOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import { toPublicCampaign } from '../lib/serialize';
import { notifyNewApplication } from '../lib/triggers';

const router = Router();

/**
 * Upper bound on the candidate pool for the logged-in-creator relevance sort.
 * Relevance (niche/location boost, PRD §13) is computed in JS over the most
 * recent N matching campaigns, then paginated. Beyond N the long tail falls back
 * to newest-first; ample for v1 volumes and avoids an aggregation pipeline that
 * would bypass the shared serializer.
 */
const RELEVANCE_CANDIDATE_CAP = 200;

// --- Validation ---------------------------------------------------------------

const deliverableSchema = z.object({
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  quantity: z.coerce.number().int().min(1).default(1),
  requirements: z.string().trim().max(1000).optional(),
});

const rewardSchema = z.object({
  type: z.enum(REWARD_TYPES),
  description: z.string().trim().min(1, 'reward description is required').max(1000),
  estimatedValue: z.coerce.number().min(0).optional(),
});

const locationSchema = z
  .object({
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
  })
  .optional();

const campaignCreateSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(160),
  description: z.string().trim().min(1, 'description is required').max(5000),
  category: z.enum(CATEGORIES),
  isRemote: z.boolean().default(false),
  location: locationSchema,
  reward: rewardSchema,
  deliverables: z.array(deliverableSchema).max(20).default([]),
  deadline: z.coerce.date().optional(),
  spotsTotal: z.coerce.number().int().min(1, 'at least one spot is required').max(10000),
  minFollowers: z.coerce.number().int().min(0).default(0),
  tags: z.array(z.string().trim().max(40)).max(30).default([]),
  coverImage: z.string().trim().max(2048).nullable().optional(),
  // On create a business may save a Draft or Publish straight to Active.
  status: z.enum(['Draft', 'Active']).default('Draft'),
});

// Update reuses the create shape but every field is optional (partial PUT).
const campaignUpdateSchema = campaignCreateSchema
  .omit({ status: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

const statusSchema = z.object({
  status: z.enum(['Draft', 'Active', 'Paused', 'Closed', 'Completed']),
});

const applySchema = z.object({
  pitch: z.string().trim().max(2000).optional(),
});

const FOLLOWER_BUCKETS: Record<string, { min?: number; max?: number }> = {
  under1k: { max: 999 },
  '1k-10k': { min: 1000, max: 9999 },
  '10k-50k': { min: 10000, max: 49999 },
  '50k+': { min: 50000 },
  // Audience-size tiers used by the mobile filter sheet (PRD §13). Filter campaigns
  // by the minimum follower requirement that fits each creator tier.
  nano: { max: 9999 },
  micro: { min: 10000, max: 49999 },
  mid: { min: 50000, max: 199999 },
  macro: { min: 200000 },
};

const listQuerySchema = z.object({
  category: z.string().optional(),
  location: z.string().trim().optional(),
  rewardType: z.string().optional(),
  platform: z.string().trim().optional(),
  followersBucket: z
    .enum(['under1k', '1k-10k', '10k-50k', '50k+', 'nano', 'micro', 'mid', 'macro'])
    .optional(),
  tags: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['Draft', 'Active', 'Paused', 'Closed', 'Completed']).optional(),
  businessId: z.string().optional(),
  // `?mine=true` only — any other value is treated as not-mine (avoids the
  // z.coerce.boolean footgun where "false" coerces to true).
  mine: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  sort: z
    .enum(['relevance', 'newest', 'deadline', 'reward', 'most_applied', 'fewest_spots'])
    .optional(),
});

/** Split a `a,b,c` query value into a trimmed, non-empty list. */
function csv(value?: string): string[] {
  return value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

// --- Helpers ------------------------------------------------------------------

/** Load a campaign or throw 404. */
async function findCampaignOr404(id: string): Promise<CampaignDoc> {
  const campaign = await Campaign.findById(id);
  if (!campaign) throw new AppError(404, 'Campaign not found');
  return campaign;
}

/** The signed-in business's own profile, or 404 if they haven't onboarded. */
async function requireBusinessProfile(userId: unknown) {
  const profile = await BusinessProfile.findOne({ userId });
  if (!profile) throw new AppError(404, 'Create your business profile before posting campaigns');
  return profile;
}

/** Sort spec for the explicit (non-relevance) sorts. Featured always floats up. */
function sortSpec(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'deadline':
      return { isFeatured: -1, deadline: 1 };
    case 'reward':
      return { isFeatured: -1, 'reward.estimatedValue': -1 };
    case 'most_applied':
      return { isFeatured: -1, applicationsCount: -1 };
    case 'fewest_spots':
      return { isFeatured: -1, spotsRemaining: 1 };
    case 'newest':
    default:
      return { isFeatured: -1, createdAt: -1 };
  }
}

// --- Routes -------------------------------------------------------------------

/**
 * GET /api/campaigns — the discovery feed (PRD §13). Guest-accessible. Applies
 * the filter/sort query params; for a signed-in creator with the default sort it
 * ranks by niche/location relevance. Public callers only ever see non-spam
 * Active campaigns; an owner can pass `mine=true` (+ any `status`) to manage
 * their own, and `businessId` scopes to one business's public Active campaigns.
 */
router.get(
  '/',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<CampaignDoc> = {};

    // Scope + visibility.
    if (q.mine) {
      if (req.user?.role !== 'business') {
        throw new AppError(403, 'Only a business can list its own campaigns');
      }
      const profile = await requireBusinessProfile(req.user._id);
      filter.businessId = profile._id;
      if (q.status) filter.status = q.status;
    } else {
      // Public discovery: only non-spam Active campaigns by default.
      filter.status = q.status && req.user ? q.status : 'Active';
      filter.isSpam = { $ne: true };
      if (q.businessId) filter.businessId = objectIdParam(q.businessId, 'businessId');
    }

    // Filters (PRD §13).
    const categories = csv(q.category);
    if (categories.length) filter.category = { $in: categories };

    const rewardTypes = csv(q.rewardType);
    if (rewardTypes.length) filter['reward.type'] = { $in: rewardTypes };

    if (q.platform && q.platform !== 'Any') {
      // Match deliverables on the chosen platform, or "Any"-platform campaigns.
      filter['deliverables.platform'] = { $in: [q.platform, 'Any'] };
    }

    if (q.location) {
      if (q.location.toLowerCase() === 'remote') filter.isRemote = true;
      else filter['location.city'] = { $regex: `^${escapeRegex(q.location)}$`, $options: 'i' };
    }

    if (q.followersBucket) {
      const bucket = FOLLOWER_BUCKETS[q.followersBucket];
      const range: Record<string, number> = {};
      if (bucket.min !== undefined) range.$gte = bucket.min;
      if (bucket.max !== undefined) range.$lte = bucket.max;
      filter.minFollowers = range;
    }

    const tags = csv(q.tags);
    if (tags.length) filter.tags = { $in: tags };

    if (q.q) {
      const rx = { $regex: escapeRegex(q.q), $options: 'i' };
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const total = await Campaign.countDocuments(filter);

    // Relevance ranking for a signed-in creator on the default sort (PRD §13).
    const useRelevance = (!q.sort || q.sort === 'relevance') && req.user?.role === 'creator';
    if (useRelevance) {
      const creator = await CreatorProfile.findOne({ userId: req.user!._id });
      const niches = new Set(creator?.niche ?? []);
      const city = creator?.location?.city?.toLowerCase();

      const candidates = await Campaign.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(RELEVANCE_CANDIDATE_CAP)
        .populate('businessId');

      const scored = candidates
        .map((c) => {
          const tagMatches = c.tags.reduce((n, t) => n + (niches.has(t as never) ? 1 : 0), 0);
          const locMatch = city && c.location?.city?.toLowerCase() === city ? 1 : 0;
          return { c, score: tagMatches * 2 + locMatch + (c.isFeatured ? 100 : 0) };
        })
        .sort((a, b) => b.score - a.score);

      const page = scored
        .slice(pagination.skip, pagination.skip + pagination.limit)
        .map(({ c }) => toPublicCampaign(c));
      res.status(200).json(paginated(page, total, pagination));
      return;
    }

    // Explicit sort (or guest/business): straight DB sort + page.
    const docs = await Campaign.find(filter)
      .sort(sortSpec(q.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('businessId');

    res.status(200).json(paginated(docs.map(toPublicCampaign), total, pagination));
  }),
);

/** POST /api/campaigns — create a campaign (businessOnly). */
router.post(
  '/',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const data = campaignCreateSchema.parse(req.body);
    const profile = await requireBusinessProfile(req.user!._id);

    const campaign = await Campaign.create({
      ...data,
      businessId: profile._id,
      spotsRemaining: data.spotsTotal,
    });

    await BusinessProfile.updateOne({ _id: profile._id }, { $inc: { totalCampaigns: 1 } });

    res.status(201).json({ campaign: toPublicCampaign(campaign) });
  }),
);

/** GET /api/campaigns/:id — single campaign with its business (guest-accessible). */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const campaign = await Campaign.findById(id).populate('businessId');
    if (!campaign) throw new AppError(404, 'Campaign not found');
    res.status(200).json({ campaign: toPublicCampaign(campaign) });
  }),
);

/** Assert the signed-in user owns this campaign (or is an admin). */
async function assertOwnerOrAdmin(campaign: CampaignDoc, req: Express.Request): Promise<void> {
  if (req.user!.role === 'admin') return;
  const profile = await BusinessProfile.findOne({ userId: req.user!._id });
  if (!profile || !campaign.businessId.equals(profile._id)) {
    throw new AppError(403, 'You do not own this campaign');
  }
}

/** PUT /api/campaigns/:id — update an owned campaign. */
router.put(
  '/:id',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = campaignUpdateSchema.parse(req.body);
    const campaign = await findCampaignOr404(id);
    await assertOwnerOrAdmin(campaign, req);

    // Keep spotsRemaining consistent if spotsTotal changes: never drop below the
    // number already accepted (PRD §11 — a business can't un-accept by shrinking).
    if (data.spotsTotal !== undefined && data.spotsTotal !== campaign.spotsTotal) {
      const accepted = await Application.countDocuments({
        campaignId: campaign._id,
        status: { $in: ['Accepted', 'Completed'] },
      });
      if (data.spotsTotal < accepted) {
        throw new AppError(409, `Cannot set spots below the ${accepted} already accepted`);
      }
      campaign.spotsRemaining = data.spotsTotal - accepted;
    }

    Object.assign(campaign, data);
    await campaign.save();

    res.status(200).json({ campaign: toPublicCampaign(campaign) });
  }),
);

/** DELETE /api/campaigns/:id — owner or admin; cascades the campaign's applications. */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role === 'creator') throw new AppError(403, 'Creators cannot delete campaigns');
    const id = objectIdParam(req.params.id);
    const campaign = await findCampaignOr404(id);
    await assertOwnerOrAdmin(campaign, req);

    await Application.deleteMany({ campaignId: campaign._id });
    await campaign.deleteOne();
    await BusinessProfile.updateOne(
      { _id: campaign.businessId, totalCampaigns: { $gt: 0 } },
      { $inc: { totalCampaigns: -1 } },
    );

    res.status(200).json({ deleted: true, id });
  }),
);

/** PATCH /api/campaigns/:id/status — enforce the PRD §12 transition machine. */
router.patch(
  '/:id/status',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { status } = statusSchema.parse(req.body);
    const campaign = await findCampaignOr404(id);
    await assertOwnerOrAdmin(campaign, req);

    const from = campaign.status;
    if (from === status) {
      res.status(200).json({ campaign: toPublicCampaign(campaign) });
      return;
    }
    if (!canTransitionCampaign(from, status as CampaignStatus)) {
      throw new AppError(409, `Cannot move a campaign from ${from} to ${status}`);
    }

    // Completion requires every accepted collab to be verified first (PRD §12).
    if (status === 'Completed') {
      const openCollabs = await Application.countDocuments({
        campaignId: campaign._id,
        status: 'Accepted',
      });
      if (openCollabs > 0) {
        throw new AppError(409, `${openCollabs} accepted collab(s) still need verifying`);
      }
    }

    campaign.status = status as CampaignStatus;
    await campaign.save();
    res.status(200).json({ campaign: toPublicCampaign(campaign) });
  }),
);

/** POST /api/campaigns/:id/apply — creator applies (PRD §11 flow rules). */
router.post(
  '/:id/apply',
  authenticate,
  creatorOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { pitch } = applySchema.parse(req.body);
    const campaign = await findCampaignOr404(id);

    // PRD §11: only Active campaigns with spots remaining accept applications.
    if (campaign.status !== 'Active') {
      throw new AppError(409, `This campaign is ${campaign.status} and not accepting applications`);
    }
    if (campaign.spotsRemaining <= 0) {
      throw new AppError(409, 'This campaign has no spots remaining');
    }

    const creator = await CreatorProfile.findOne({ userId: req.user!._id });
    if (!creator) throw new AppError(404, 'Create your creator profile before applying');

    // One application per (campaign, creator) — pre-check for a clean message,
    // backstopped by the unique compound index against races.
    if (await Application.exists({ campaignId: campaign._id, creatorId: creator._id })) {
      throw new AppError(409, 'You have already applied to this campaign');
    }

    let application;
    try {
      application = await Application.create({
        campaignId: campaign._id,
        creatorId: creator._id,
        businessId: campaign.businessId,
        pitch,
        status: 'Pending',
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new AppError(409, 'You have already applied to this campaign');
      }
      throw err;
    }

    await Campaign.updateOne({ _id: campaign._id }, { $inc: { applicationsCount: 1 } });

    // Notify the business (best-effort).
    const business = await BusinessProfile.findById(campaign.businessId);
    if (business) {
      await notifyNewApplication({
        businessUserId: business.userId.toString(),
        businessName: business.businessName,
        creatorName: req.user!.name,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
      });
    }

    res.status(201).json({ application: { _id: application.id, status: application.status } });
  }),
);

/** Escape user input used inside a `$regex` so it's treated literally. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;
