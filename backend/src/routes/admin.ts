/**
 * Admin routes (PRD §7.5, §14, §18) — in-app moderation, all `adminOnly`.
 * Dashboard stats, user management (ban/role/delete), campaign moderation
 * (force-close/feature/spam/delete), business + creator moderation
 * (verify/suspend/delete), and the reports queue (list + act).
 *
 *   GET    /api/admin/dashboard           overview stat cards
 *   GET    /api/admin/users               user list (filter + paginate)
 *   PATCH  /api/admin/users/:id           ban / unban / change role
 *   DELETE /api/admin/users/:id           delete user + cascade their data
 *   GET    /api/admin/campaigns           all campaigns (filter + paginate)
 *   PATCH  /api/admin/campaigns/:id        force-close / feature / spam
 *   DELETE /api/admin/campaigns/:id        delete campaign + its applications
 *   GET    /api/admin/businesses          business profiles (filter + paginate)
 *   PATCH  /api/admin/businesses/:id       verify / suspend
 *   GET    /api/admin/creators            creator profiles (paginate)
 *   PATCH  /api/admin/creators/:id         suspend
 *   GET    /api/admin/reports             reports queue (filter + paginate)
 *   PATCH  /api/admin/reports/:id          dismiss / act
 */
import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { User, type UserDoc } from '../models/User';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { Campaign } from '../models/Campaign';
import { Application } from '../models/Application';
import { Report, type ReportDoc } from '../models/Report';
import { USER_ROLES } from '../../../shared/constants/statuses';
import { REPORT_STATUSES } from '../../../shared/constants/reports';
import { adminApiKeyOrAuthenticate } from '../middleware/authenticate';
import { adminOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import {
  toPublicUser,
  toPublicBusinessProfile,
  toPublicCreatorProfile,
  toPublicCampaign,
  toPublicReport,
} from '../lib/serialize';
import { notifyCreatorVerified, notifyBusinessVerified } from '../lib/triggers';

const router = Router();

// Every route here is admin-only. Auth is satisfied either by a JWT admin (the
// in-app/mobile admin) or by the dashboard's `x-admin-api-key` server-to-server key.
router.use(adminApiKeyOrAuthenticate, adminOnly);

/** Escape user input used inside a `$regex`. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * When a profile's `userId` ref has been `.populate()`d, serialize the owner to a
 * full `PublicUser`. The admin business/creator moderation lists need the owner's
 * display name **and email** (for the dashboard) — both live on the User, not the
 * profile.
 */
function publicUserOf(ref: unknown): ReturnType<typeof toPublicUser> | null {
  return ref && typeof ref === 'object' && 'name' in ref ? toPublicUser(ref as UserDoc) : null;
}

// --- Dashboard ---------------------------------------------------------------

/** GET /api/admin/dashboard — the overview stat cards (PRD §7.5). */
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfToday.getDay());

    const [
      totalUsers,
      businesses,
      creators,
      admins,
      totalCampaigns,
      activeCampaigns,
      totalApplications,
      applicationsToday,
      collabsCompleted,
      signupsToday,
      signupsThisWeek,
      openReports,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'business' }),
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'admin' }),
      Campaign.countDocuments({}),
      Campaign.countDocuments({ status: 'Active' }),
      Application.countDocuments({}),
      Application.countDocuments({ createdAt: { $gte: startOfToday } }),
      Application.countDocuments({ status: 'Completed' }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Report.countDocuments({ status: 'open' }),
    ]);

    res.status(200).json({
      users: { total: totalUsers, businesses, creators, admins },
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      applications: { total: totalApplications, today: applicationsToday },
      collabsCompleted,
      signups: { today: signupsToday, thisWeek: signupsThisWeek },
      openReports,
    });
  }),
);

// --- Users -------------------------------------------------------------------

const userListSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  q: z.string().trim().max(120).optional(),
  banned: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

/** GET /api/admin/users — user list with role/search/banned filters. */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { role, q, banned } = userListSchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<UserDoc> = {};
    if (role) filter.role = role;
    if (banned !== undefined) filter.isBanned = banned;
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: 'i' };
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const total = await User.countDocuments(filter);
    const docs = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    res.status(200).json(paginated(docs.map(toPublicUser), total, pagination));
  }),
);

const userPatchSchema = z
  .object({
    isBanned: z.boolean().optional(),
    role: z.enum(USER_ROLES).optional(),
  })
  .refine((v) => v.isBanned !== undefined || v.role !== undefined, 'Provide isBanned or role');

/** PATCH /api/admin/users/:id — ban/unban or change role. */
router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = userPatchSchema.parse(req.body);

    if (id === req.user!.id && data.isBanned) {
      throw new AppError(400, 'You cannot ban your own account');
    }

    const user = await User.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    if (data.isBanned !== undefined) user.isBanned = data.isBanned;
    if (data.role !== undefined) user.role = data.role;
    await user.save();

    res.status(200).json({ user: toPublicUser(user) });
  }),
);

/** DELETE /api/admin/users/:id — delete the user and cascade their data. */
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    if (id === req.user!.id) throw new AppError(400, 'You cannot delete your own account');

    const user = await User.findById(id);
    if (!user) throw new AppError(404, 'User not found');

    if (user.role === 'business') {
      const profile = await BusinessProfile.findOne({ userId: user._id }).select('_id');
      if (profile) {
        const campaigns = await Campaign.find({ businessId: profile._id }).select('_id');
        const campaignIds = campaigns.map((c) => c._id);
        await Application.deleteMany({
          $or: [{ businessId: profile._id }, { campaignId: { $in: campaignIds } }],
        });
        await Campaign.deleteMany({ businessId: profile._id });
        await BusinessProfile.deleteOne({ _id: profile._id });
      }
    } else if (user.role === 'creator') {
      const profile = await CreatorProfile.findOne({ userId: user._id }).select('_id');
      if (profile) {
        await Application.deleteMany({ creatorId: profile._id });
        await CreatorProfile.deleteOne({ _id: profile._id });
      }
    }

    await User.deleteOne({ _id: user._id });
    res.status(200).json({ deleted: true, id });
  }),
);

// --- Campaigns ---------------------------------------------------------------

const campaignListSchema = z.object({
  status: z.enum(['Draft', 'Active', 'Paused', 'Closed', 'Completed']).optional(),
  q: z.string().trim().max(120).optional(),
  flagged: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

/** GET /api/admin/campaigns — every campaign across all businesses. */
router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const { status, q, flagged } = campaignListSchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<unknown> = {};
    if (status) filter.status = status;
    if (flagged) filter.isSpam = true;
    if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

    const total = await Campaign.countDocuments(filter);
    const docs = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('businessId');

    res.status(200).json(
      paginated(
        docs.map((c) => toPublicCampaign(c, { role: 'admin' })),
        total,
        pagination,
      ),
    );
  }),
);

const campaignPatchSchema = z
  .object({
    forceClose: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isSpam: z.boolean().optional(),
  })
  .refine(
    (v) => v.forceClose !== undefined || v.isFeatured !== undefined || v.isSpam !== undefined,
    'Provide forceClose, isFeatured, or isSpam',
  );

/** PATCH /api/admin/campaigns/:id — force-close / feature / mark spam. */
router.patch(
  '/campaigns/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = campaignPatchSchema.parse(req.body);
    const campaign = await Campaign.findById(id);
    if (!campaign) throw new AppError(404, 'Campaign not found');

    // Admin override bypasses the §12 transition machine intentionally.
    if (data.forceClose) campaign.status = 'Closed';
    if (data.isFeatured !== undefined) campaign.isFeatured = data.isFeatured;
    if (data.isSpam !== undefined) campaign.isSpam = data.isSpam;
    await campaign.save();

    res.status(200).json({ campaign: toPublicCampaign(campaign, { role: 'admin' }) });
  }),
);

/** DELETE /api/admin/campaigns/:id — delete a campaign + its applications. */
router.delete(
  '/campaigns/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const campaign = await Campaign.findById(id);
    if (!campaign) throw new AppError(404, 'Campaign not found');

    await Application.deleteMany({ campaignId: campaign._id });
    await campaign.deleteOne();
    await BusinessProfile.updateOne(
      { _id: campaign.businessId, totalCampaigns: { $gt: 0 } },
      { $inc: { totalCampaigns: -1 } },
    );

    res.status(200).json({ deleted: true, id });
  }),
);

// --- Businesses --------------------------------------------------------------

/** GET /api/admin/businesses — business profiles with moderation fields. */
router.get(
  '/businesses',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { q, verified } = z
      .object({
        q: z.string().trim().max(120).optional(),
        verified: z
          .string()
          .optional()
          .transform((v) => (v === undefined ? undefined : v === 'true')),
      })
      .parse(req.query);
    const filter: FilterQuery<unknown> = {};
    if (q) filter.businessName = { $regex: escapeRegex(q), $options: 'i' };
    if (verified !== undefined) filter.isVerified = verified;

    const total = await BusinessProfile.countDocuments(filter);
    const docs = await BusinessProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('userId');

    const data = docs.map((d) => ({
      ...toPublicBusinessProfile(d),
      user: publicUserOf(d.userId),
    }));
    res.status(200).json(paginated(data, total, pagination));
  }),
);

const businessPatchSchema = z
  .object({
    isVerified: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
  })
  .refine((v) => v.isVerified !== undefined || v.isSuspended !== undefined, 'Nothing to update');

/** PATCH /api/admin/businesses/:id — verify / suspend a business. */
router.patch(
  '/businesses/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = businessPatchSchema.parse(req.body);
    const profile = await BusinessProfile.findById(id);
    if (!profile) throw new AppError(404, 'Business profile not found');
    const wasVerified = profile.isVerified;
    if (data.isVerified !== undefined) profile.isVerified = data.isVerified;
    if (data.isSuspended !== undefined) profile.isSuspended = data.isSuspended;
    await profile.save();

    // First-time approval → notify the owner (push + in-app + live socket).
    if (data.isVerified === true && !wasVerified) {
      void notifyBusinessVerified({
        businessUserId: String(profile.userId),
        businessName: profile.businessName,
      });
    }
    res.status(200).json({ profile: toPublicBusinessProfile(profile) });
  }),
);

// --- Creators ----------------------------------------------------------------

/** GET /api/admin/creators — creator profiles with moderation fields. */
router.get(
  '/creators',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { verified } = z
      .object({
        verified: z
          .string()
          .optional()
          .transform((v) => (v === undefined ? undefined : v === 'true')),
      })
      .parse(req.query);
    const filter: FilterQuery<unknown> = {};
    if (verified !== undefined) filter.isVerified = verified;

    const total = await CreatorProfile.countDocuments(filter);
    const docs = await CreatorProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('userId');
    const data = docs.map((d) => ({
      ...toPublicCreatorProfile(d),
      user: publicUserOf(d.userId),
    }));
    res.status(200).json(paginated(data, total, pagination));
  }),
);

const creatorPatchSchema = z
  .object({
    isVerified: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
  })
  .refine((v) => v.isVerified !== undefined || v.isSuspended !== undefined, 'Nothing to update');

/** PATCH /api/admin/creators/:id — verify (approve/revoke) / suspend a creator. */
router.patch(
  '/creators/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = creatorPatchSchema.parse(req.body);
    const profile = await CreatorProfile.findById(id);
    if (!profile) throw new AppError(404, 'Creator profile not found');
    const wasVerified = profile.isVerified;
    if (data.isVerified !== undefined) profile.isVerified = data.isVerified;
    if (data.isSuspended !== undefined) profile.isSuspended = data.isSuspended;
    await profile.save();

    // First-time approval → notify the creator (push + in-app + live socket).
    if (data.isVerified === true && !wasVerified) {
      void notifyCreatorVerified({ creatorUserId: String(profile.userId) });
    }
    res.status(200).json({ profile: toPublicCreatorProfile(profile) });
  }),
);

// --- Reports -----------------------------------------------------------------

const reportListSchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
});

/** GET /api/admin/reports — the moderation queue, newest first. */
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { status } = reportListSchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<ReportDoc> = {};
    if (status) filter.status = status;

    const total = await Report.countDocuments(filter);
    const docs = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    res.status(200).json(paginated(docs.map(toPublicReport), total, pagination));
  }),
);

const reportPatchSchema = z.object({ status: z.enum(['dismissed', 'actioned']) });

/** PATCH /api/admin/reports/:id — dismiss or mark a report actioned. */
router.patch(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { status } = reportPatchSchema.parse(req.body);
    const report = await Report.findById(id);
    if (!report) throw new AppError(404, 'Report not found');

    report.status = status;
    report.resolvedBy = req.user!._id;
    report.resolvedAt = new Date();
    await report.save();

    res.status(200).json({ report: toPublicReport(report) });
  }),
);

export default router;
