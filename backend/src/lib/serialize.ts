/**
 * Serializers that turn Mongoose docs into the client-safe shapes declared in
 * `/shared/types`. Keeping these in one place guarantees secrets (passwordHash,
 * reset tokens) never leak into an API response, and that every route returns
 * the same JSON shape for a given entity.
 *
 * Each `toPublic*` maps a document to its `/shared/types` interface: `_id` and
 * every `ref` become string ids, and `Date`s become ISO-8601 strings. Where a
 * `ref` has been `.populate()`d, the populated doc is serialized and attached
 * under a friendly key (e.g. a campaign's `business`) *in addition to* the id,
 * so list/detail screens get joined data without an extra round-trip.
 */
import { Types } from 'mongoose';
import type { UserDoc } from '../models/User';
import type { BusinessProfileDoc } from '../models/BusinessProfile';
import type { CreatorProfileDoc } from '../models/CreatorProfile';
import type { CampaignDoc } from '../models/Campaign';
import type { ApplicationDoc } from '../models/Application';
import type { NotificationDoc } from '../models/Notification';
import type { ReportDoc } from '../models/Report';
import type { PublicUser, UserSummary } from '../../../shared/types/User';
import type { BusinessProfile } from '../../../shared/types/BusinessProfile';
import type { CreatorProfile } from '../../../shared/types/CreatorProfile';
import type { Campaign } from '../../../shared/types/Campaign';
import type { Application } from '../../../shared/types/Application';
import type { Notification } from '../../../shared/types/Notification';
import type { Report } from '../../../shared/types/Report';

/** A `ref` field that may be a raw ObjectId or a populated document. */
type Ref<T> = Types.ObjectId | (T & { _id: Types.ObjectId }) | null | undefined;

/** Resolve the string id of a ref whether it's an ObjectId or a populated doc. */
export function refId(value: Ref<unknown>): string {
  if (value == null) return '';
  if (value instanceof Types.ObjectId) return value.toString();
  const id = (value as { _id?: Types.ObjectId; id?: string })._id;
  return id ? id.toString() : String((value as { id?: string }).id ?? '');
}

/** True when a ref has been `.populate()`d into a full document. */
function isPopulated<T>(value: Ref<T>): value is T & { _id: Types.ObjectId } {
  return value != null && !(value instanceof Types.ObjectId);
}

const iso = (d?: Date | null): string | undefined => (d ? d.toISOString() : undefined);

// --- User --------------------------------------------------------------------

/** Strip server-only fields from a User doc → the `PublicUser` shape. */
export function toPublicUser(user: UserDoc): PublicUser {
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    isVerified: user.isVerified,
    isOnboarded: user.isOnboarded,
    isBanned: user.isBanned,
    pushToken: user.pushToken ?? null,
    notificationPrefs: {
      push: user.notificationPrefs?.push !== false,
      email: user.notificationPrefs?.email !== false,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Minimal user reference for embedding in lists/cards. */
export function toUserSummary(user: UserDoc): UserSummary {
  return {
    _id: user.id,
    name: user.name,
    avatar: user.avatar ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

// --- Profiles ----------------------------------------------------------------

export function toPublicBusinessProfile(p: BusinessProfileDoc): BusinessProfile {
  return {
    _id: p.id,
    userId: refId(p.userId as Ref<unknown>),
    businessName: p.businessName,
    description: p.description,
    category: p.category,
    location: p.location ?? {},
    website: p.website,
    socialLinks: p.socialLinks ?? {},
    logo: p.logo ?? null,
    isVerified: p.isVerified,
    isSuspended: p.isSuspended,
    totalCampaigns: p.totalCampaigns,
    totalCollabsCompleted: p.totalCollabsCompleted,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toPublicCreatorProfile(p: CreatorProfileDoc): CreatorProfile {
  return {
    _id: p.id,
    userId: refId(p.userId as Ref<unknown>),
    bio: p.bio,
    niche: p.niche,
    location: p.location ?? {},
    socialHandles: p.socialHandles ?? {},
    contentTypes: p.contentTypes,
    portfolio: p.portfolio,
    totalCollabsCompleted: p.totalCollabsCompleted,
    totalRewardsEarned: p.totalRewardsEarned,
    isUGCOnly: p.isUGCOnly,
    isSuspended: p.isSuspended,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// --- Campaign ----------------------------------------------------------------

/** A campaign with optionally-joined business profile (when `businessId` is populated). */
export type PublicCampaign = Campaign & { business?: BusinessProfile };

export function toPublicCampaign(c: CampaignDoc): PublicCampaign {
  const out: PublicCampaign = {
    _id: c.id,
    businessId: refId(c.businessId as Ref<unknown>),
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    isRemote: c.isRemote,
    reward: c.reward,
    deliverables: c.deliverables,
    deadline: iso(c.deadline) ?? '',
    spotsTotal: c.spotsTotal,
    spotsRemaining: c.spotsRemaining,
    minFollowers: c.minFollowers,
    status: c.status,
    tags: c.tags,
    coverImage: c.coverImage ?? null,
    applicationsCount: c.applicationsCount,
    isFeatured: c.isFeatured,
    isSpam: c.isSpam,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
  if (isPopulated<BusinessProfileDoc>(c.businessId as Ref<BusinessProfileDoc>)) {
    out.business = toPublicBusinessProfile(c.businessId as unknown as BusinessProfileDoc);
  }
  return out;
}

// --- Application --------------------------------------------------------------

/** An application with optionally-joined campaign / creator / business refs. */
export type PublicApplication = Application & {
  campaign?: PublicCampaign;
  creator?: CreatorProfile;
  /**
   * The creator's User summary (name + avatar) — present when the application's
   * `creatorId` was populated with a nested `userId`. The business-side applicant
   * and submission lists (PRD §7.4) need the creator's display name, which lives
   * on the User rather than the CreatorProfile.
   */
  creatorUser?: UserSummary;
  business?: BusinessProfile;
};

export function toPublicApplication(a: ApplicationDoc): PublicApplication {
  const out: PublicApplication = {
    _id: a.id,
    campaignId: refId(a.campaignId as Ref<unknown>),
    creatorId: refId(a.creatorId as Ref<unknown>),
    businessId: refId(a.businessId as Ref<unknown>),
    pitch: a.pitch,
    status: a.status,
    submissionLink: a.submissionLink,
    submissionProof: a.submissionProof,
    submissionNote: a.submissionNote,
    submittedAt: iso(a.submittedAt),
    verifiedAt: iso(a.verifiedAt),
    verifiedBy: a.verifiedBy ? refId(a.verifiedBy as Ref<unknown>) : undefined,
    businessNote: a.businessNote,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
  if (isPopulated<CampaignDoc>(a.campaignId as Ref<CampaignDoc>)) {
    out.campaign = toPublicCampaign(a.campaignId as unknown as CampaignDoc);
  }
  if (isPopulated<CreatorProfileDoc>(a.creatorId as Ref<CreatorProfileDoc>)) {
    const creatorDoc = a.creatorId as unknown as CreatorProfileDoc;
    out.creator = toPublicCreatorProfile(creatorDoc);
    // When the creator's `userId` was nested-populated, attach the name/avatar the
    // business needs to label the applicant (PRD §7.4).
    if (isPopulated<UserDoc>(creatorDoc.userId as Ref<UserDoc>)) {
      out.creatorUser = toUserSummary(creatorDoc.userId as unknown as UserDoc);
    }
  }
  if (isPopulated<BusinessProfileDoc>(a.businessId as Ref<BusinessProfileDoc>)) {
    out.business = toPublicBusinessProfile(a.businessId as unknown as BusinessProfileDoc);
  }
  return out;
}

// --- Notification ------------------------------------------------------------

export function toPublicNotification(n: NotificationDoc): Notification {
  return {
    _id: n.id,
    userId: refId(n.userId as Ref<unknown>),
    type: n.type,
    message: n.message,
    deepLinkPath: n.deepLinkPath,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

// --- Report ------------------------------------------------------------------

export function toPublicReport(r: ReportDoc): Report {
  return {
    _id: r.id,
    reporterId: refId(r.reporterId as Ref<unknown>),
    targetType: r.targetType,
    targetId: refId(r.targetId as Ref<unknown>),
    reason: r.reason,
    status: r.status,
    resolvedBy: r.resolvedBy ? refId(r.resolvedBy as Ref<unknown>) : null,
    resolvedAt: iso(r.resolvedAt) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
