/**
 * Application routes (PRD §11, §18) — the collab lifecycle after "apply":
 * list/read (scoped by role), accept/reject by the business, submit by the
 * creator, and verify/revision/fail by the business. The first acceptance
 * auto-closes the campaign (hidden from discovery, no new applications) while the
 * business keeps approving from the people who already applied.
 *
 *   GET   /api/applications          role-scoped list (creator=own, business=theirs)
 *   GET   /api/applications/:id       single (participants + admin only)
 *   PATCH /api/applications/:id        accept / reject (businessOnly, owns campaign)
 *   POST  /api/applications/:id/submit creator submits content (creatorOnly, owns it)
 *   PATCH /api/applications/:id/verify verify / request revision / fail (businessOnly)
 */
import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { Application, type ApplicationDoc } from '../models/Application';
import { Campaign } from '../models/Campaign';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { User } from '../models/User';
import { APPLICATION_STATUSES } from '../../../shared/constants/statuses';
import { authenticate } from '../middleware/authenticate';
import { businessOnly, creatorOnly } from '../middleware/authorize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import { toPublicApplication } from '../lib/serialize';
import { getOrCreateConversationForApplication } from '../lib/conversations';
import { emitToUser } from '../lib/realtime';
import { notify } from '../services';
import {
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifySubmissionReceived,
  notifySubmissionVerified,
  notifyRevisionRequested,
} from '../lib/triggers';

const router = Router();

// --- Validation ---------------------------------------------------------------

const listQuerySchema = z.object({
  status: z.string().optional(),
  campaignId: z.string().optional(),
});

const decisionSchema = z.object({
  status: z.enum(['Accepted', 'Rejected']),
  businessNote: z.string().trim().max(1000).optional(),
});

const submitSchema = z.object({
  submissionLink: z.string().trim().min(1, 'submissionLink is required').max(2048),
  submissionProof: z.string().trim().max(2048).optional(),
  submissionNote: z.string().trim().max(1000).optional(),
});

const verifySchema = z.object({
  action: z.enum(['verify', 'revision', 'fail']),
  note: z.string().trim().max(1000).optional(),
});

// --- Helpers ------------------------------------------------------------------

/** Resolve the caller's role profile id (BusinessProfile/CreatorProfile). */
async function profileIdFor(req: Express.Request): Promise<string | null> {
  if (req.user!.role === 'business') {
    const p = await BusinessProfile.findOne({ userId: req.user!._id }).select('_id');
    return p ? p.id : null;
  }
  if (req.user!.role === 'creator') {
    const p = await CreatorProfile.findOne({ userId: req.user!._id }).select('_id');
    return p ? p.id : null;
  }
  return null;
}

/** Load an application or throw 404. */
async function findApplicationOr404(id: string): Promise<ApplicationDoc> {
  const app = await Application.findById(id);
  if (!app) throw new AppError(404, 'Application not found');
  return app;
}

/** The owning business profile of an application, asserting the caller owns it. */
async function assertBusinessOwns(app: ApplicationDoc, req: Express.Request) {
  const profile = await BusinessProfile.findOne({ userId: req.user!._id });
  if (!profile || !app.businessId.equals(profile._id)) {
    throw new AppError(403, 'You do not manage this application');
  }
  return profile;
}

// --- Routes -------------------------------------------------------------------

/**
 * GET /api/applications — scoped to the caller's role (PRD §11):
 *   creator  → applications they filed
 *   business → applications to their campaigns (optionally one `campaignId`)
 *   admin    → all (optionally filtered)
 * Supports a `status` filter (single or `a,b` csv) and pagination.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, campaignId } = listQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<ApplicationDoc> = {};

    if (req.user!.role === 'creator') {
      const creatorId = await profileIdFor(req);
      if (!creatorId) {
        res.status(200).json(paginated([], 0, pagination));
        return;
      }
      filter.creatorId = creatorId;
      // Lets a creator check their own application to one campaign (detail screen).
      if (campaignId) filter.campaignId = objectIdParam(campaignId, 'campaignId');
    } else if (req.user!.role === 'business') {
      const businessId = await profileIdFor(req);
      if (!businessId) {
        res.status(200).json(paginated([], 0, pagination));
        return;
      }
      filter.businessId = businessId;
      if (campaignId) filter.campaignId = objectIdParam(campaignId, 'campaignId');
    } else {
      // admin
      if (campaignId) filter.campaignId = objectIdParam(campaignId, 'campaignId');
    }

    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is (typeof APPLICATION_STATUSES)[number] =>
          (APPLICATION_STATUSES as readonly string[]).includes(s),
        );
      if (statuses.length) filter.status = { $in: statuses };
    }

    const total = await Application.countDocuments(filter);
    const docs = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('campaignId')
      // Nested-populate the creator's User so the business gets the applicant's
      // display name/avatar (lives on User, not CreatorProfile) — PRD §7.4.
      .populate({ path: 'creatorId', populate: { path: 'userId' } });

    res.status(200).json(paginated(docs.map(toPublicApplication), total, pagination));
  }),
);

/** GET /api/applications/:id — participants (creator/business) or admin only. */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const app = await Application.findById(id)
      .populate('campaignId')
      .populate({ path: 'creatorId', populate: { path: 'userId' } })
      .populate('businessId');
    if (!app) throw new AppError(404, 'Application not found');

    if (req.user!.role !== 'admin') {
      const profileId = await profileIdFor(req);
      const ownsIt =
        req.user!.role === 'creator'
          ? profileId && app.creatorId && refEquals(app.creatorId, profileId)
          : profileId && app.businessId && refEquals(app.businessId, profileId);
      if (!ownsIt) throw new AppError(403, 'You cannot view this application');
    }

    res.status(200).json({ application: toPublicApplication(app) });
  }),
);

/**
 * PATCH /api/applications/:id — business accepts or rejects a pending application
 * (PRD §11). The first acceptance auto-closes the campaign (Active→Closed) so it
 * leaves discovery and stops new applications, while the business keeps approving
 * the people who already applied.
 */
router.patch(
  '/:id',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { status, businessNote } = decisionSchema.parse(req.body);
    const app = await findApplicationOr404(id);
    await assertBusinessOwns(app, req);

    if (app.status !== 'Pending') {
      throw new AppError(409, `Only pending applications can be ${status.toLowerCase()}`);
    }

    if (status === 'Accepted') {
      // No fixed capacity: a business approves as many applicants as it wants.
      // The first approval auto-closes the campaign — hidden from discovery and no
      // new applications — while the business keeps approving people who already
      // applied. Approvals are allowed while the campaign is Active or Closed.
      const campaign = await Campaign.findById(app.campaignId);
      if (!campaign || (campaign.status !== 'Active' && campaign.status !== 'Closed')) {
        throw new AppError(409, 'This campaign is no longer accepting approvals');
      }
      if (campaign.status === 'Active') {
        campaign.status = 'Closed';
        await campaign.save();
      }

      app.status = 'Accepted';
      if (businessNote) app.businessNote = businessNote;
      await app.save();

      // The accepted application is the business⇄creator connection — open a chat
      // conversation for it (idempotent), stamp its id back onto the app, and ping
      // both participants so their conversation lists update live.
      const conversation = await getOrCreateConversationForApplication(app);
      if (conversation) {
        if (!app.conversationId) {
          app.conversationId = conversation._id;
          await app.save();
        }
        emitToUser(String(conversation.businessUserId), 'conversation:new', {
          conversationId: conversation.id,
        });
        emitToUser(String(conversation.creatorUserId), 'conversation:new', {
          conversationId: conversation.id,
        });
      }

      const creatorUser = await creatorUserFor(app.creatorId);
      const business = await BusinessProfile.findById(app.businessId).select('businessName');
      if (creatorUser) {
        await notifyApplicationAccepted({
          creatorUserId: creatorUser.id,
          creatorName: creatorUser.name,
          businessName: business?.businessName ?? 'A business',
          applicationId: app.id,
          campaignTitle: campaign.title,
        });
      }
      res.status(200).json({ application: toPublicApplication(app) });
      return;
    }

    // Rejected.
    app.status = 'Rejected';
    if (businessNote) app.businessNote = businessNote;
    await app.save();

    const campaign = await Campaign.findById(app.campaignId).select('title');
    const creatorUser = await creatorUserFor(app.creatorId);
    if (creatorUser) {
      await notifyApplicationRejected({
        creatorUserId: creatorUser.id,
        creatorName: creatorUser.name,
        applicationId: app.id,
        campaignTitle: campaign?.title ?? 'a campaign',
      });
    }
    res.status(200).json({ application: toPublicApplication(app) });
  }),
);

/** POST /api/applications/:id/submit — creator submits content (PRD §11, §7.3). */
router.post(
  '/:id/submit',
  authenticate,
  creatorOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const data = submitSchema.parse(req.body);
    const app = await findApplicationOr404(id);

    const creatorId = await profileIdFor(req);
    if (!creatorId || !refEquals(app.creatorId, creatorId)) {
      throw new AppError(403, 'This is not your application');
    }
    // Submission is only valid once accepted (covers the resubmit-after-revision
    // case, where the app is set back to Accepted) or after going Overdue.
    if (app.status !== 'Accepted' && app.status !== 'Overdue') {
      throw new AppError(409, 'You can only submit content for an accepted collab');
    }

    app.submissionLink = data.submissionLink;
    if (data.submissionProof) app.submissionProof = data.submissionProof;
    if (data.submissionNote) app.submissionNote = data.submissionNote;
    app.submittedAt = new Date();
    if (app.status === 'Overdue') app.status = 'Accepted'; // back in review
    await app.save();

    const campaign = await Campaign.findById(app.campaignId).select('title');
    const business = await BusinessProfile.findById(app.businessId).select('userId');
    if (business) {
      await notifySubmissionReceived({
        businessUserId: business.userId.toString(),
        creatorName: req.user!.name,
        applicationId: app.id,
        campaignTitle: campaign?.title ?? 'a campaign',
      });
    }

    res.status(200).json({ application: toPublicApplication(app) });
  }),
);

/**
 * POST /api/applications/:id/remind — business nudges an accepted creator who
 * hasn't submitted yet (PRD §7.4 "send reminder"). In-app + push only (there's no
 * §9.2 email template), pointing the creator at the submit screen. Allowed only
 * while the collab is Accepted and still awaiting content.
 */
router.post(
  '/:id/remind',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const app = await findApplicationOr404(id);
    await assertBusinessOwns(app, req);

    if (app.status !== 'Accepted' || app.submittedAt) {
      throw new AppError(409, 'You can only remind a creator who has yet to submit');
    }

    const campaign = await Campaign.findById(app.campaignId).select('title');
    const creatorUser = await creatorUserFor(app.creatorId);
    if (creatorUser) {
      try {
        await notify({
          recipient: creatorUser.id,
          type: 'submission_reminder',
          message: `Reminder: your content for "${campaign?.title ?? 'a campaign'}" is still due.`,
          deepLinkPath: `/collabs/${app.id}/submit`,
        });
      } catch (err) {
        console.error(
          '[applications] remind notify error:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    res.status(200).json({ reminded: true });
  }),
);

/**
 * POST /api/applications/:id/withdraw — creator withdraws their own application
 * (PRD §11 edge cases). Only a still-Pending application can be withdrawn; once
 * accepted the collab is in flight (the business must fail it to free the spot).
 */
router.post(
  '/:id/withdraw',
  authenticate,
  creatorOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const app = await findApplicationOr404(id);

    const creatorId = await profileIdFor(req);
    if (!creatorId || !refEquals(app.creatorId, creatorId)) {
      throw new AppError(403, 'This is not your application');
    }
    if (app.status !== 'Pending') {
      throw new AppError(409, 'Only a pending application can be withdrawn');
    }

    app.status = 'Withdrawn';
    await app.save();

    // The application is no longer in contention — drop it from the campaign's
    // applicant tally (never below zero).
    await Campaign.updateOne(
      { _id: app.campaignId, applicationsCount: { $gt: 0 } },
      { $inc: { applicationsCount: -1 } },
    );

    res.status(200).json({ application: toPublicApplication(app) });
  }),
);

/**
 * PATCH /api/applications/:id/verify — business reviews a submission (PRD §11):
 *   verify   → collab Completed, counters bumped, creator notified
 *   revision → kept Accepted (creator resubmits), revision notification sent
 *   fail     → Cancelled, the spot is returned to the campaign
 */
router.patch(
  '/:id/verify',
  authenticate,
  businessOnly,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { action, note } = verifySchema.parse(req.body);
    const app = await findApplicationOr404(id);
    await assertBusinessOwns(app, req);

    if (app.status !== 'Accepted') {
      throw new AppError(409, 'Only an accepted collab can be reviewed');
    }
    if (!app.submittedAt) {
      throw new AppError(409, 'Nothing submitted to review yet');
    }

    const campaign = await Campaign.findById(app.campaignId).select('title reward');
    const creatorUser = await creatorUserFor(app.creatorId);
    if (note) app.businessNote = note;

    if (action === 'verify') {
      app.status = 'Completed';
      app.verifiedAt = new Date();
      app.verifiedBy = req.user!._id;
      await app.save();

      // Bump completion counters (PRD §5.2/§5.3 totals).
      const reward = campaign?.reward?.estimatedValue ?? 0;
      await Promise.all([
        CreatorProfile.updateOne(
          { _id: app.creatorId },
          { $inc: { totalCollabsCompleted: 1, totalRewardsEarned: reward } },
        ),
        BusinessProfile.updateOne({ _id: app.businessId }, { $inc: { totalCollabsCompleted: 1 } }),
      ]);

      if (creatorUser) {
        await notifySubmissionVerified({
          creatorUserId: creatorUser.id,
          creatorName: creatorUser.name,
          applicationId: app.id,
          campaignTitle: campaign?.title ?? 'a campaign',
        });
      }
      res.status(200).json({ application: toPublicApplication(app) });
      return;
    }

    if (action === 'revision') {
      // Stays Accepted; clear the submission timestamp so it's "awaiting resubmit".
      app.submittedAt = undefined;
      await app.save();
      if (creatorUser) {
        await notifyRevisionRequested({
          creatorUserId: creatorUser.id,
          creatorName: creatorUser.name,
          applicationId: app.id,
          campaignTitle: campaign?.title ?? 'a campaign',
          note,
        });
      }
      res.status(200).json({ application: toPublicApplication(app) });
      return;
    }

    // fail → Cancelled. There's no capacity to free up (no spots model).
    app.status = 'Cancelled';
    await app.save();
    if (creatorUser) {
      // In-app + push only — there's no §9.2 email template for a failed collab.
      await safeFailNotify(creatorUser.id, app.id, campaign?.title ?? 'a campaign');
    }
    res.status(200).json({ application: toPublicApplication(app) });
  }),
);

// --- Local helpers ------------------------------------------------------------

/** Compare a (possibly populated) ref to a string id. */
function refEquals(ref: unknown, id: string): boolean {
  if (ref == null) return false;
  const value = (ref as { _id?: { toString(): string } })._id ?? ref;
  return String(value) === id;
}

/** Resolve the User behind a CreatorProfile id (for notifications). */
async function creatorUserFor(creatorProfileId: unknown) {
  const profile = await CreatorProfile.findById(creatorProfileId).select('userId');
  if (!profile) return null;
  return User.findById(profile.userId).select('name');
}

/** Best-effort "collab failed" in-app + push (no email template exists). */
async function safeFailNotify(creatorUserId: string, applicationId: string, campaignTitle: string) {
  try {
    await notify({
      recipient: creatorUserId,
      type: 'collab_failed',
      message: `Your submission for "${campaignTitle}" was marked as not fulfilled.`,
      deepLinkPath: `/collabs/${applicationId}`,
    });
  } catch (err) {
    console.error('[applications] fail notify error:', err instanceof Error ? err.message : err);
  }
}

export default router;
