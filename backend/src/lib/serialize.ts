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
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import type { UserDoc } from '../models/User';
import type { BusinessProfileDoc } from '../models/BusinessProfile';
import type { CreatorProfileDoc } from '../models/CreatorProfile';
import type { CampaignDoc } from '../models/Campaign';
import type { ApplicationDoc } from '../models/Application';
import type { ConversationDoc } from '../models/Conversation';
import type { MessageDoc } from '../models/Message';
import type { NotificationDoc } from '../models/Notification';
import type { ReportDoc } from '../models/Report';
import type { PublicUser, UserSummary } from '../../../shared/types/User';
import type { BusinessProfile } from '../../../shared/types/BusinessProfile';
import type { CreatorProfile } from '../../../shared/types/CreatorProfile';
import type { Campaign, CampaignLocation } from '../../../shared/types/Campaign';
import type { GeoPoint } from '../../../shared/types/common';
import type { Application } from '../../../shared/types/Application';
import type { Conversation } from '../../../shared/types/Conversation';
import type { Message } from '../../../shared/types/Message';
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

/**
 * The viewer's relationship to a campaign, used to decide whether the **exact**
 * location is revealed (On-Site Location feature). Anyone not authorized only
 * ever receives a fuzzed approximate point — the precise coordinates/address are
 * stripped before the JSON leaves the server. Defaults (no context) are the
 * safe, unauthorized case.
 */
export interface CampaignViewerContext {
  role?: 'creator' | 'business' | 'admin' | 'guest';
  /** The viewing business owns this campaign. */
  isOwner?: boolean;
  /** The viewing creator has an Accepted/Completed application for this campaign. */
  isAcceptedCreator?: boolean;
}

/** Default radius (metres) of the approximate circle shown to unauthorized viewers. */
export const DEFAULT_FUZZ_RADIUS_METERS = 750;

/** Metres per degree of latitude (≈constant). Longitude scales by cos(lat). */
const METERS_PER_DEG_LAT = 111_320;

/** Round to ~5 decimals (~1 m) so the fuzzed point can't be reversed to source precision. */
function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Deterministically fuzz an exact point into an approximate one, seeded by the
 * campaign id so the circle never jitters between requests for the same viewer.
 * The offset is pushed out to 40–100% of the radius (never centered on the real
 * pin) at a hash-derived angle, then rounded. Computed **server-side** — exact
 * coords never leave the server for an unauthorized viewer.
 */
export function fuzzPoint(
  point: GeoPoint,
  seed: string,
  radiusMeters: number = DEFAULT_FUZZ_RADIUS_METERS,
): GeoPoint {
  const h = createHash('sha256').update(seed).digest();
  const angle = (h.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
  const distance = radiusMeters * (0.4 + 0.6 * (h.readUInt32BE(4) / 0xffffffff));
  const dLat = (distance * Math.cos(angle)) / METERS_PER_DEG_LAT;
  const cosLat = Math.cos((point.lat * Math.PI) / 180) || 1e-6;
  const dLng = (distance * Math.sin(angle)) / (METERS_PER_DEG_LAT * cosLat);
  return { lat: round5(point.lat + dLat), lng: round5(point.lng + dLng) };
}

/**
 * Build the client-facing `location`, enforcing the precision policy:
 *  - no pin stored → coarse city/state/country only (`locationPrecise: false`).
 *  - authorized viewer → exact `coordinates` + `address` + `placeId`.
 *  - everyone else → only the fuzzed `approxCoordinates` + `radiusMeters`; the
 *    exact fields are omitted entirely (never serialized).
 */
function serializeCampaignLocation(
  c: CampaignDoc,
  canSeeExact: boolean,
): CampaignLocation | undefined {
  const loc = c.location;
  if (!loc) return undefined;

  const base: CampaignLocation = {
    ...(loc.city ? { city: loc.city } : {}),
    ...(loc.state ? { state: loc.state } : {}),
    ...(loc.country ? { country: loc.country } : {}),
  };

  const coords = loc.coordinates;
  const hasPin = !!coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
  if (!hasPin) {
    // Coarse-only campaign (remote, not yet pinned, or maps "coming soon").
    return Object.keys(base).length ? { ...base, locationPrecise: false } : undefined;
  }

  if (canSeeExact) {
    return {
      ...base,
      coordinates: { lat: coords!.lat, lng: coords!.lng },
      ...(loc.address ? { address: loc.address } : {}),
      ...(loc.placeId ? { placeId: loc.placeId } : {}),
      locationPrecise: true,
    };
  }

  // Unauthorized: fuzz server-side; never include the real coords/address/placeId.
  return {
    ...base,
    approxCoordinates: fuzzPoint({ lat: coords!.lat, lng: coords!.lng }, c.id),
    radiusMeters: DEFAULT_FUZZ_RADIUS_METERS,
    locationPrecise: false,
  };
}

export function toPublicCampaign(
  c: CampaignDoc,
  viewer: CampaignViewerContext = {},
): PublicCampaign {
  const canSeeExact = Boolean(
    viewer.role === 'admin' || viewer.isOwner || viewer.isAcceptedCreator,
  );
  const out: PublicCampaign = {
    _id: c.id,
    businessId: refId(c.businessId as Ref<unknown>),
    title: c.title,
    description: c.description,
    category: c.category,
    location: serializeCampaignLocation(c, canSeeExact),
    isRemote: c.isRemote,
    reward: c.reward,
    deliverables: c.deliverables,
    deadline: iso(c.deadline) ?? '',
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
    // Set once the collab is accepted — the chat thread for this connection.
    conversationId: a.conversationId ? refId(a.conversationId as Ref<unknown>) : undefined,
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

// --- Chat --------------------------------------------------------------------

/**
 * Serialize a conversation for one viewer. `unreadCount` and `otherParticipant`
 * are viewer-relative: the caller resolves the other participant's summary (a
 * business shows as its `businessName`/`logo`, a creator as their `name`/`avatar`)
 * and passes it in, since serializers stay DB-free.
 */
export function toPublicConversation(
  c: ConversationDoc,
  viewerUserId: string,
  otherParticipant?: UserSummary,
): Conversation {
  const businessUserId = refId(c.businessUserId as Ref<unknown>);
  const creatorUserId = refId(c.creatorUserId as Ref<unknown>);
  const viewerIsBusiness = businessUserId === viewerUserId;
  return {
    _id: c.id,
    applicationId: refId(c.applicationId as Ref<unknown>),
    campaignId: refId(c.campaignId as Ref<unknown>),
    campaignTitle: c.campaignTitle,
    businessUserId,
    creatorUserId,
    otherParticipant,
    lastMessage: c.lastMessage,
    lastMessageAt: iso(c.lastMessageAt),
    lastSenderUserId: c.lastSenderUserId ? refId(c.lastSenderUserId as Ref<unknown>) : undefined,
    unreadCount: viewerIsBusiness ? c.unreadByBusiness : c.unreadByCreator,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toPublicMessage(m: MessageDoc): Message {
  return {
    _id: m.id,
    conversationId: refId(m.conversationId as Ref<unknown>),
    senderUserId: refId(m.senderUserId as Ref<unknown>),
    senderRole: m.senderRole,
    body: m.body,
    readAt: iso(m.readAt),
    createdAt: m.createdAt.toISOString(),
  };
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
