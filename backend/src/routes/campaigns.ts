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
import { toPublicCampaign, type CampaignViewerContext } from '../lib/serialize';
import { isGeocodingConfigured, forwardGeocode, reverseGeocode } from '../services';
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

const geoPointSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const locationSchema = z
  .object({
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    // On-Site Location: an exact pin + address (optional — coarse city still works).
    // Unknown extras (e.g. approxCoordinates from an edit round-trip) are stripped.
    coordinates: geoPointSchema.optional(),
    address: z.string().trim().max(300).optional(),
    placeId: z.string().trim().max(300).optional(),
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
  sort: z.enum(['relevance', 'newest', 'deadline', 'reward', 'most_applied']).optional(),
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

/** String id of a campaign's business ref, whether it's populated or a raw id. */
function campaignBusinessId(c: CampaignDoc): string {
  const b = c.businessId as unknown as { _id?: unknown };
  if (b && typeof b === 'object' && '_id' in b && b._id) return String(b._id);
  return String(c.businessId);
}

/**
 * Resolve the location-precision policy for the current request (On-Site Location
 * feature). Does the per-role lookups **once**, then returns a cheap per-campaign
 * classifier so each serialized campaign reveals its exact pin only to an admin,
 * the owning business, or a creator with an Accepted/Completed application.
 */
async function resolveCampaignViewer(
  req: Express.Request,
): Promise<(c: CampaignDoc) => CampaignViewerContext> {
  const role = req.user?.role;

  if (role === 'admin') return () => ({ role: 'admin' });

  if (role === 'business') {
    const profile = await BusinessProfile.findOne({ userId: req.user!._id }).select('_id');
    const pid = profile?._id?.toString();
    return (c) => ({ role: 'business', isOwner: !!pid && campaignBusinessId(c) === pid });
  }

  if (role === 'creator') {
    const creator = await CreatorProfile.findOne({ userId: req.user!._id }).select('_id');
    if (!creator) return () => ({ role: 'creator' });
    const accepted = await Application.find({
      creatorId: creator._id,
      status: { $in: ['Accepted', 'Completed'] },
    }).select('campaignId');
    const acceptedSet = new Set(accepted.map((a) => a.campaignId.toString()));
    return (c) => ({ role: 'creator', isAcceptedCreator: acceptedSet.has(c.id) });
  }

  return () => ({ role: 'guest' });
}

type ParsedLocation = z.infer<typeof locationSchema>;

/** True when the new pin is meaningfully different from the stored one. */
function pinMoved(
  next: { lat: number; lng: number },
  prev?: { lat?: number; lng?: number },
): boolean {
  if (!prev || typeof prev.lat !== 'number' || typeof prev.lng !== 'number') return false;
  return Math.abs(next.lat - prev.lat) > 1e-6 || Math.abs(next.lng - prev.lng) > 1e-6;
}

/**
 * Best-effort geocode-on-save: fill in whichever of (address ⇄ coordinates) the
 * business left blank, using the server-side Geocoding key. A no-op (and never
 * throws) when geocoding isn't configured — the manually-dropped pin stands.
 *
 * `prevCoords` is the campaign's stored pin on an edit. If the pin moved, the
 * `address`/`placeId` carried over from the edit round-trip are now stale, so we
 * drop them — that re-arms the reverse-geocode branch below, and even when
 * geocoding is off (or returns nothing) we'd rather store no address than a wrong
 * one that contradicts the new coordinates.
 */
async function applyGeocoding(
  loc: ParsedLocation,
  prevCoords?: { lat?: number; lng?: number },
): Promise<ParsedLocation> {
  if (!loc) return loc;
  if (loc.coordinates && pinMoved(loc.coordinates, prevCoords)) {
    loc.address = undefined;
    loc.placeId = undefined;
  }
  if (!isGeocodingConfigured()) return loc;
  try {
    if (loc.coordinates && !loc.address) {
      const r = await reverseGeocode(loc.coordinates.lat, loc.coordinates.lng);
      if (r) {
        if (r.formatted) loc.address = r.formatted;
        if (!loc.placeId && r.placeId) loc.placeId = r.placeId;
      }
    } else if (!loc.coordinates && loc.address) {
      const r = await forwardGeocode(loc.address);
      if (r) {
        loc.coordinates = { lat: r.lat, lng: r.lng };
        if (!loc.placeId && r.placeId) loc.placeId = r.placeId;
      }
    }
  } catch {
    /* best-effort; never block a save on a geocoding hiccup */
  }
  return loc;
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

    // Location-precision classifier for this viewer (On-Site Location feature).
    const viewerFor = await resolveCampaignViewer(req);

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
        .map(({ c }) => toPublicCampaign(c, viewerFor(c)));
      res.status(200).json(paginated(page, total, pagination));
      return;
    }

    // Explicit sort (or guest/business): straight DB sort + page.
    const docs = await Campaign.find(filter)
      .sort(sortSpec(q.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('businessId');

    res.status(200).json(
      paginated(
        docs.map((c) => toPublicCampaign(c, viewerFor(c))),
        total,
        pagination,
      ),
    );
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

    // Publishing (status Active) requires a verified business. An unverified
    // ("under review") business may still save the campaign as a Draft.
    if (data.status === 'Active' && !profile.isVerified) {
      throw new AppError(
        403,
        'Your business is under review. Save it as a draft — you can publish once an admin verifies you.',
      );
    }

    // Fill address ⇄ coordinates server-side when geocoding is configured.
    if (data.location) data.location = await applyGeocoding(data.location);

    const campaign = await Campaign.create({
      ...data,
      businessId: profile._id,
    });

    await BusinessProfile.updateOne({ _id: profile._id }, { $inc: { totalCampaigns: 1 } });

    // The owner just created it → reveal the exact pin back to them.
    res.status(201).json({
      campaign: toPublicCampaign(campaign, { role: 'business', isOwner: true }),
    });
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
    // Reveal the exact pin only to the owner / admin / an accepted creator.
    const viewerFor = await resolveCampaignViewer(req);
    res.status(200).json({ campaign: toPublicCampaign(campaign, viewerFor(campaign)) });
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

    // Fill address ⇄ coordinates server-side when geocoding is configured, and
    // drop a stale carried-over address if the pin moved. Capture the prior pin
    // BEFORE Object.assign overwrites it.
    if (data.location) {
      const prevCoords = campaign.location?.coordinates;
      data.location = await applyGeocoding(data.location, prevCoords);
    }

    Object.assign(campaign, data);
    await campaign.save();

    // The owner is editing → reveal the exact pin back to them.
    res.status(200).json({
      campaign: toPublicCampaign(campaign, { role: 'business', isOwner: true }),
    });
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

    // Publishing (→ Active) requires a verified business; an admin may force it.
    if (status === 'Active' && req.user!.role !== 'admin') {
      const business = await BusinessProfile.findById(campaign.businessId).select('isVerified');
      if (!business?.isVerified) {
        throw new AppError(
          403,
          'Your business is under review. You can publish campaigns once an admin verifies you.',
        );
      }
    }

    const from = campaign.status;
    const ownerView: CampaignViewerContext = { role: 'business', isOwner: true };
    if (from === status) {
      res.status(200).json({ campaign: toPublicCampaign(campaign, ownerView) });
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
    res.status(200).json({ campaign: toPublicCampaign(campaign, ownerView) });
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

    // Only Active campaigns accept applications. A campaign auto-closes on the
    // business's first approval, so a Closed campaign is no longer open to apply.
    if (campaign.status !== 'Active') {
      throw new AppError(409, `This campaign is ${campaign.status} and not accepting applications`);
    }

    const creator = await CreatorProfile.findOne({ userId: req.user!._id });
    if (!creator) throw new AppError(404, 'Create your creator profile before applying');

    // Admin approval gate: an unverified ("under review") creator can browse but
    // not apply until an admin verifies them.
    if (!creator.isVerified) {
      throw new AppError(
        403,
        'Your creator account is under review. You can apply once an admin verifies you.',
      );
    }

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
