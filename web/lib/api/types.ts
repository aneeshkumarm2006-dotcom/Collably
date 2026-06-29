/**
 * Response-envelope and request-shape types for the data layer. These mirror the
 * backend's serializers (`backend/src/lib/serialize.ts`) and route response
 * bodies exactly — the domain entities themselves come from the shared package
 * (`@/lib/shared`); only the *envelopes* (pagination, joined refs, auth) and the
 * `HttpClient` contract live here.
 */
import type {
  PublicUser,
  UserSummary,
  BusinessProfile,
  CreatorProfile,
  Campaign,
  Application,
  Conversation,
  Message,
  Notification,
  Report,
  ApplicationStatus,
  CampaignStatus,
} from '@/lib/shared';
import type { FollowerBucket, CampaignSort, UploadFolder } from '@/lib/constants';

// --- Transport contract -------------------------------------------------------

/**
 * Query-string params. `buildQuery` drops nullish/empty values, joins arrays as
 * CSV, and stringifies the rest — so a typed params object (e.g.
 * `CampaignListParams`) can be passed directly. Values are `unknown` to accept
 * those typed objects without a cast.
 */
export type QueryParams = Record<string, unknown>;

export interface RequestOptions {
  query?: QueryParams;
  signal?: AbortSignal;
  /** Override the transport's default caching (server defaults to `no-store`). */
  cache?: RequestCache;
  /** Next.js fetch cache hints (ISR revalidate window / cache tags) for public reads. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Extra headers merged over the transport defaults. */
  headers?: HeadersInit;
}

/**
 * The minimal HTTP surface a resource module needs. Both the server transport
 * (cookie → Bearer, direct to backend) and the client transport (same-origin
 * proxy) implement this, so resource definitions are written once and reused.
 */
export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
}

// --- Pagination ---------------------------------------------------------------

/** Standard list envelope: `{ data, page, limit, total, totalPages }`. */
export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

// --- Campaigns ----------------------------------------------------------------

/** A campaign with its business profile joined (when the ref was populated). */
export type PublicCampaign = Campaign & { business?: BusinessProfile };

export interface CampaignListParams extends PageParams {
  q?: string;
  category?: string | string[];
  location?: string;
  rewardType?: string | string[];
  platform?: string;
  followersBucket?: FollowerBucket;
  tags?: string | string[];
  status?: CampaignStatus;
  businessId?: string;
  mine?: boolean;
  sort?: CampaignSort;
}

export type CampaignListResponse = Paginated<PublicCampaign>;
export interface CampaignResponse {
  campaign: PublicCampaign;
}

/** Minimal ack returned by `POST /campaigns/:id/apply`. */
export interface ApplyResponse {
  application: { _id: string; status: ApplicationStatus };
}

export interface CampaignDeletedResponse {
  deleted: true;
  id: string;
}

// --- Applications -------------------------------------------------------------

/** An application with optionally-joined campaign / creator / business refs. */
export type PublicApplication = Application & {
  campaign?: PublicCampaign;
  creator?: CreatorProfile;
  /** The creator's User summary (name + avatar) for business-side applicant lists. */
  creatorUser?: UserSummary;
  business?: BusinessProfile;
};

export interface ApplicationListParams extends PageParams {
  /** Single status or a CSV of statuses. */
  status?: ApplicationStatus | string;
  campaignId?: string;
}

export type ApplicationListResponse = Paginated<PublicApplication>;
export interface ApplicationResponse {
  application: PublicApplication;
}

export interface SubmitContentInput {
  submissionLink: string;
  submissionProof?: string;
  submissionNote?: string;
}

export interface VerifyInput {
  action: 'verify' | 'revision' | 'fail';
  note?: string;
}

// --- Profiles -----------------------------------------------------------------

export interface BusinessProfileResponse {
  profile: BusinessProfile;
}
export interface CreatorProfileResponse {
  profile: CreatorProfile;
}
/** Public profile lookups join the owning user's summary (name/avatar). */
export interface PublicCreatorProfileResponse {
  profile: CreatorProfile;
  user: UserSummary;
}
export interface PublicBusinessProfileResponse {
  profile: BusinessProfile;
  user: UserSummary | null;
}

// --- Conversations / messages -------------------------------------------------

export type ConversationListResponse = Paginated<Conversation>;
export interface ConversationResponse {
  conversation: Conversation;
}
export interface MessagesResponse {
  messages: Message[];
}
export interface MessageResponse {
  message: Message;
}
export interface MessageHistoryParams {
  /** ISO cursor — fetch messages created before this time. */
  before?: string;
  limit?: number;
}

// --- Notifications ------------------------------------------------------------

export interface NotificationListResponse extends Paginated<Notification> {
  unreadCount: number;
}
export interface NotificationsReadResponse {
  updated: number;
  unreadCount: number;
}

// --- Auth ---------------------------------------------------------------------

/** Backend auth success envelope: public user + a fresh access/refresh pair. */
export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  /** Present on the Google route — whether a new account was just created. */
  isNewUser?: boolean;
}

export interface MeResponse {
  user: PublicUser;
  /** Admin approval of the caller's role profile (the apply/publish gate). */
  approved: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
  /** Non-production only: the raw reset token, surfaced so the flow is testable. */
  devResetToken?: string;
}

// --- Upload -------------------------------------------------------------------

export interface UploadSignInput {
  folder?: UploadFolder;
  publicId?: string;
  tags?: string[];
}

/** Signed direct-to-Cloudinary upload params (shape from `services/cloudinary`). */
export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder?: string;
  publicId?: string;
  [key: string]: unknown;
}

// --- Geocoding ----------------------------------------------------------------

export interface GeoResult {
  lat: number;
  lng: number;
  formatted?: string;
  placeId?: string;
}
export interface GeocodingStatusResponse {
  configured: boolean;
}
export interface GeocodingResultResponse {
  configured: boolean;
  result: GeoResult | null;
}

// --- Reports ------------------------------------------------------------------

export interface FileReportInput {
  targetType: 'campaign' | 'business' | 'creator' | 'user';
  targetId: string;
  reason: string;
}
export interface ReportResponse {
  report: Report;
}
