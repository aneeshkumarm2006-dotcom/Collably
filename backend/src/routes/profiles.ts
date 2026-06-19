/**
 * Profile routes (PRD §7.2, §18). The current user's own role profile —
 * business or creator. `GET` reads it; `PUT` upserts it (creating it on first
 * call, which is how onboarding in Phase 11 persists the profile) and marks the
 * User onboarded. A user only ever touches their *own* profile here; public
 * profiles of others are served by the campaigns/applications joins and the
 * `/api/creator/:id` / `/api/business/:id` lookups (Phase 12/13 screens).
 *
 *   GET /api/profile/business   read own business profile (404 until created)
 *   PUT /api/profile/business   create-or-update own business profile
 *   GET /api/profile/creator    read own creator profile
 *   PUT /api/profile/creator    create-or-update own creator profile
 */
import { Router } from 'express';
import { z } from 'zod';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { User } from '../models/User';
import { CATEGORIES } from '../../../shared/constants/categories';
import { NICHES } from '../../../shared/constants/niches';
import { CONTENT_TYPES } from '../../../shared/constants/contentTypes';
import { authenticate } from '../middleware/authenticate';
import { businessOnly, creatorOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam } from '../lib/http';
import { toPublicBusinessProfile, toPublicCreatorProfile, toUserSummary } from '../lib/serialize';

const router = Router();

// --- Shared validation pieces -------------------------------------------------

const locationSchema = z
  .object({
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
  })
  .optional();

const urlish = z.string().trim().max(2048);

// --- Business profile ---------------------------------------------------------

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1, 'businessName is required').max(160),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(CATEGORIES),
  location: locationSchema,
  website: urlish.optional(),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(200).optional(),
      youtube: z.string().trim().max(200).optional(),
      tiktok: z.string().trim().max(200).optional(),
    })
    .optional(),
  logo: urlish.nullable().optional(),
});

/** GET /api/profile/business — the signed-in business's profile. */
router.get(
  '/business',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const profile = await BusinessProfile.findOne({ userId: req.user!._id });
    if (!profile) {
      throw new AppError(404, 'Business profile not found — complete onboarding first');
    }
    res.status(200).json({ profile: toPublicBusinessProfile(profile) });
  }),
);

/** PUT /api/profile/business — create or update the signed-in business's profile. */
router.put(
  '/business',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const data = businessProfileSchema.parse(req.body);
    const userId = req.user!._id;

    const existing = await BusinessProfile.findOne({ userId });
    const profile = existing
      ? Object.assign(existing, data)
      : new BusinessProfile({ ...data, userId });
    await profile.save();

    // First profile completes onboarding (PRD §7.2).
    if (!existing && !req.user!.isOnboarded) {
      await User.updateOne({ _id: userId }, { isOnboarded: true });
    }

    res.status(existing ? 200 : 201).json({ profile: toPublicBusinessProfile(profile) });
  }),
);

// --- Creator profile ----------------------------------------------------------

const handleNumber = z.coerce.number().min(0);
/** A creator's public profile URL for a platform — required when that platform is submitted. */
const socialLink = z.string().trim().min(1, 'A profile link is required').max(2048);

/**
 * Creators must submit at least one social handle (Instagram, TikTok or YouTube),
 * each with a `handle` **and** a `link`; follower/subscriber counts are optional.
 * `socialHandles` is required and refined to ensure ≥1 platform is present.
 */
const creatorProfileSchema = z
  .object({
    bio: z.string().trim().max(2000).optional(),
    niche: z.array(z.enum(NICHES)).max(20).optional(),
    location: locationSchema,
    socialHandles: z.object({
      instagram: z
        .object({
          handle: z.string().trim().min(1).max(120),
          link: socialLink,
          followerCount: handleNumber.optional(),
          engagementRate: handleNumber.optional(),
        })
        .optional(),
      youtube: z
        .object({
          handle: z.string().trim().min(1).max(120),
          link: socialLink,
          subscriberCount: handleNumber.optional(),
        })
        .optional(),
      tiktok: z
        .object({
          handle: z.string().trim().min(1).max(120),
          link: socialLink,
          followerCount: handleNumber.optional(),
        })
        .optional(),
    }),
    contentTypes: z.array(z.enum(CONTENT_TYPES)).max(20).optional(),
    portfolio: z
      .array(
        z.object({
          imageUrl: urlish,
          caption: z.string().trim().max(500).optional(),
          link: urlish.optional(),
        }),
      )
      .max(6, 'A portfolio can hold at most 6 items')
      .optional(),
    isUGCOnly: z.boolean().optional(),
  })
  .refine(
    (d) => Boolean(d.socialHandles.instagram || d.socialHandles.youtube || d.socialHandles.tiktok),
    {
      message: 'Add at least one social handle (Instagram, TikTok or YouTube) with its link.',
      path: ['socialHandles'],
    },
  );

/** GET /api/profile/creator — the signed-in creator's profile. */
router.get(
  '/creator',
  authenticate,
  creatorOnly,
  asyncHandler(async (req, res) => {
    const profile = await CreatorProfile.findOne({ userId: req.user!._id });
    if (!profile) {
      throw new AppError(404, 'Creator profile not found — complete onboarding first');
    }
    res.status(200).json({ profile: toPublicCreatorProfile(profile) });
  }),
);

/** PUT /api/profile/creator — create or update the signed-in creator's profile. */
router.put(
  '/creator',
  authenticate,
  creatorOnly,
  asyncHandler(async (req, res) => {
    const data = creatorProfileSchema.parse(req.body);
    const userId = req.user!._id;

    const existing = await CreatorProfile.findOne({ userId });
    const profile = existing
      ? Object.assign(existing, data)
      : new CreatorProfile({ ...data, userId });
    await profile.save();

    if (!existing && !req.user!.isOnboarded) {
      await User.updateOne({ _id: userId }, { isOnboarded: true });
    }

    res.status(existing ? 200 : 201).json({ profile: toPublicCreatorProfile(profile) });
  }),
);

// --- Public profile lookups (PRD §7.3, §7.4) ----------------------------------
// Read-only views of *another* user's profile, reached from a campaign's business
// link or an application's creator card. Guest-accessible (PRD §8.6); the creator
// display name + avatar live on the User, so each returns a `user` summary too.

/** GET /api/profile/creator/:id — public creator profile by CreatorProfile id. */
router.get(
  '/creator/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const profile = await CreatorProfile.findById(id);
    if (!profile) throw new AppError(404, 'Creator not found');
    const user = await User.findById(profile.userId);
    if (!user) throw new AppError(404, 'Creator not found');
    res.status(200).json({ profile: toPublicCreatorProfile(profile), user: toUserSummary(user) });
  }),
);

/** GET /api/profile/business/:id — public business profile by BusinessProfile id. */
router.get(
  '/business/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const profile = await BusinessProfile.findById(id);
    if (!profile) throw new AppError(404, 'Business not found');
    const user = await User.findById(profile.userId);
    res.status(200).json({
      profile: toPublicBusinessProfile(profile),
      user: user ? toUserSummary(user) : null,
    });
  }),
);

export default router;
