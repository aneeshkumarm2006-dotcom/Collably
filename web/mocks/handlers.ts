/**
 * MSW request handlers: the in-memory backend used when
 * `NEXT_PUBLIC_USE_MOCKS=true`. Each handler mirrors the shape and status codes
 * of the real route in `backend/src/routes/*` and reads/writes the `mocks/db`
 * store. Authed handlers resolve the caller from a `Bearer mock.<userId>` token
 * (issued by the mock login), so once Phase 3 sets the access cookie the whole
 * authed surface works against mocks with no extra wiring.
 *
 * Handlers are matched against the backend's internal URL (what `serverApi` and
 * the proxy fetch), so a single MSW node server intercepts both SSR reads and
 * browser→proxy reads.
 */
import { http, HttpResponse } from 'msw';
import { config } from '@/lib/config';
import type { Application, Campaign } from '@/lib/shared';
import {
  getDb,
  oid,
  profileIdForUser,
  publicApplication,
  publicCampaign,
  userSummary,
} from './db';

const API = config.backendInternalUrl;
const u = (path: string) => `${API}${path}`;

// --- helpers ------------------------------------------------------------------

const ok = (data: unknown, status = 200) => HttpResponse.json(data as object, { status });
const err = (status: number, message: string) => HttpResponse.json({ message }, { status });

/** Resolve the calling user id from a `Bearer mock.<id>` Authorization header. */
function viewerId(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+mock\.([a-f0-9]+)$/i);
  return m ? m[1] : null;
}

function authEnvelope(userId: string) {
  const user = getDb().users.find((x) => x._id === userId)!;
  return { user, accessToken: `mock.${userId}`, refreshToken: `mockr.${userId}` };
}

function paginate<T>(rows: T[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const total = rows.length;
  const data = rows.slice((page - 1) * limit, (page - 1) * limit + limit);
  return { data, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

const csv = (v: string | null) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

const FOLLOWER_BUCKETS: Record<string, { min?: number; max?: number }> = {
  under1k: { max: 999 },
  '1k-10k': { min: 1000, max: 9999 },
  '10k-50k': { min: 10000, max: 49999 },
  '50k+': { min: 50000 },
  nano: { max: 9999 },
  micro: { min: 10000, max: 49999 },
  mid: { min: 50000, max: 199999 },
  macro: { min: 200000 },
};

// --- handlers -----------------------------------------------------------------

export const handlers = [
  // ===== Auth =====
  http.post(u('/auth/login'), async ({ request }) => {
    const { email } = (await request.json()) as { email: string; password: string };
    const id = getDb().credentials[email?.toLowerCase()];
    if (!id) return err(401, 'Invalid email or password');
    return ok(authEnvelope(id));
  }),

  http.post(u('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      role: 'business' | 'creator';
    };
    const db = getDb();
    if (db.credentials[body.email?.toLowerCase()]) {
      return err(409, 'An account with this email already exists');
    }
    const id = oid(`new-${body.email}`);
    db.users.push({
      _id: id,
      name: body.name,
      email: body.email,
      role: body.role,
      avatar: null,
      isVerified: false,
      isOnboarded: false,
      isBanned: false,
      pushToken: null,
      notificationPrefs: { push: true, email: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    db.credentials[body.email.toLowerCase()] = id;
    return ok(authEnvelope(id), 201);
  }),

  http.post(u('/auth/refresh'), async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string };
    const m = refreshToken?.match(/^mockr\.([a-f0-9]+)$/i);
    if (!m) return err(401, 'Invalid refresh token');
    return ok(authEnvelope(m[1]));
  }),

  http.post(u('/auth/google'), async () => {
    // Deterministic demo Google account (creator).
    const id = getDb().credentials['maya@collably.app'];
    return ok({ ...authEnvelope(id), isNewUser: false });
  }),

  http.post(u('/auth/forgot-password'), async () =>
    ok({
      message: 'If an account exists for that email, a reset link has been sent.',
      devResetToken: 'mock-reset-token',
    }),
  ),

  http.post(u('/auth/reset-password'), async () => {
    const id = getDb().credentials['maya@collably.app'];
    return ok(authEnvelope(id));
  }),

  http.get(u('/auth/me'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const user = getDb().users.find((x) => x._id === id);
    if (!user) return err(401, 'Authentication required');
    const { role, profileId } = profileIdForUser(id);
    let approved = role === 'admin';
    if (role === 'creator') approved = !!getDb().creators.find((c) => c._id === profileId)?.isVerified;
    if (role === 'business') approved = !!getDb().businesses.find((b) => b._id === profileId)?.isVerified;
    return ok({ user, approved });
  }),

  http.patch(u('/auth/me'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const user = getDb().users.find((x) => x._id === id)!;
    const body = (await request.json()) as Partial<{ name: string; avatar: string | null }>;
    if (body.name !== undefined) user.name = body.name;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    return ok({ user });
  }),

  http.patch(u('/auth/password'), () => ok({ updated: true })),
  http.patch(u('/auth/email'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const user = getDb().users.find((x) => x._id === id)!;
    const { email } = (await request.json()) as { email: string };
    user.email = email;
    user.isVerified = false;
    return ok({ user });
  }),
  http.delete(u('/auth/me'), () => ok({ deleted: true })),

  // ===== Profiles =====
  http.get(u('/profile/business'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const profile = getDb().businesses.find((b) => b.userId === id);
    return profile ? ok({ profile }) : err(404, 'Business profile not found. Complete onboarding first');
  }),
  http.put(u('/profile/business'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;
    let profile = db.businesses.find((b) => b.userId === id);
    const created = !profile;
    if (profile) Object.assign(profile, body);
    else {
      profile = {
        _id: oid(`bp-${id}`),
        userId: id,
        businessName: '',
        category: 'Other',
        location: {},
        socialLinks: {},
        logo: null,
        isVerified: false,
        isSuspended: false,
        totalCampaigns: 0,
        totalCollabsCompleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(body as object),
      } as (typeof db.businesses)[number];
      db.businesses.push(profile);
    }
    // First profile completes onboarding (mirrors `backend/src/routes/profiles.ts`).
    if (created) {
      const user = db.users.find((x) => x._id === id);
      if (user) user.isOnboarded = true;
    }
    return ok({ profile }, created ? 201 : 200);
  }),
  http.get(u('/profile/creator'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const profile = getDb().creators.find((c) => c.userId === id);
    return profile ? ok({ profile }) : err(404, 'Creator profile not found. Complete onboarding first');
  }),
  http.put(u('/profile/creator'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;
    let profile = db.creators.find((c) => c.userId === id);
    const created = !profile;
    if (profile) Object.assign(profile, body);
    else {
      profile = {
        _id: oid(`cp-${id}`),
        userId: id,
        niche: [],
        location: {},
        socialHandles: {},
        contentTypes: [],
        portfolio: [],
        totalCollabsCompleted: 0,
        totalRewardsEarned: 0,
        isUGCOnly: false,
        isVerified: false,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(body as object),
      } as (typeof db.creators)[number];
      db.creators.push(profile);
    }
    // First profile completes onboarding (mirrors `backend/src/routes/profiles.ts`).
    if (created) {
      const user = db.users.find((x) => x._id === id);
      if (user) user.isOnboarded = true;
    }
    return ok({ profile }, created ? 201 : 200);
  }),
  http.get(u('/profile/creator/:id'), ({ params }) => {
    const profile = getDb().creators.find((c) => c._id === params.id);
    if (!profile) return err(404, 'Creator not found');
    return ok({ profile, user: userSummary(profile.userId) ?? null });
  }),
  http.get(u('/profile/business/:id'), ({ params }) => {
    const profile = getDb().businesses.find((b) => b._id === params.id);
    if (!profile) return err(404, 'Business not found');
    return ok({ profile, user: userSummary(profile.userId) ?? null });
  }),

  // ===== Campaigns =====
  http.get(u('/campaigns'), ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams;
    const db = getDb();
    let rows: Campaign[] = [...db.campaigns];

    if (q.get('mine') === 'true') {
      const id = viewerId(request);
      const { role, profileId } = id ? profileIdForUser(id) : { role: 'guest', profileId: undefined };
      if (role !== 'business' || !profileId) return ok(paginate([], url));
      rows = rows.filter((c) => c.businessId === profileId);
      const status = q.get('status');
      if (status) rows = rows.filter((c) => c.status === status);
    } else {
      rows = rows.filter((c) => c.status === 'Active' && !c.isSpam);
      const businessId = q.get('businessId');
      if (businessId) rows = rows.filter((c) => c.businessId === businessId);
    }

    const categories = csv(q.get('category'));
    if (categories.length) rows = rows.filter((c) => categories.includes(c.category));
    const rewardTypes = csv(q.get('rewardType'));
    if (rewardTypes.length) rows = rows.filter((c) => rewardTypes.includes(c.reward.type));
    const platform = q.get('platform');
    if (platform && platform !== 'Any') {
      rows = rows.filter((c) =>
        c.deliverables.some((d) => d.platform === platform || d.platform === 'Any'),
      );
    }
    const location = q.get('location');
    if (location) {
      if (location.toLowerCase() === 'remote') rows = rows.filter((c) => c.isRemote);
      else rows = rows.filter((c) => c.location?.city?.toLowerCase() === location.toLowerCase());
    }
    const bucket = q.get('followersBucket');
    if (bucket && FOLLOWER_BUCKETS[bucket]) {
      const { min, max } = FOLLOWER_BUCKETS[bucket];
      rows = rows.filter(
        (c) => (min === undefined || c.minFollowers >= min) && (max === undefined || c.minFollowers <= max),
      );
    }
    const tags = csv(q.get('tags'));
    if (tags.length) rows = rows.filter((c) => c.tags.some((t) => tags.includes(t)));
    const search = q.get('q');
    if (search) {
      const rx = search.toLowerCase();
      rows = rows.filter(
        (c) => c.title.toLowerCase().includes(rx) || c.description.toLowerCase().includes(rx),
      );
    }

    // Sort: featured first, then the chosen key (default newest).
    const sort = q.get('sort');
    rows.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      switch (sort) {
        case 'deadline':
          return +new Date(a.deadline) - +new Date(b.deadline);
        case 'reward':
          return (b.reward.estimatedValue ?? 0) - (a.reward.estimatedValue ?? 0);
        case 'most_applied':
          return b.applicationsCount - a.applicationsCount;
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });

    const page = paginate(rows, url);
    return ok({ ...page, data: page.data.map(publicCampaign) });
  }),

  http.post(u('/campaigns'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const { profileId } = profileIdForUser(id);
    if (!profileId) return err(404, 'Create your business profile before posting campaigns');
    const body = (await request.json()) as Record<string, unknown>;
    const db = getDb();
    const campaign: Campaign = {
      _id: oid(`camp-${Date.now()}-${db.campaigns.length}`),
      businessId: profileId,
      title: '',
      description: '',
      category: 'Other',
      isRemote: false,
      reward: { type: 'Product', description: '' },
      deliverables: [],
      deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      minFollowers: 0,
      status: 'Draft',
      tags: [],
      coverImage: null,
      applicationsCount: 0,
      isFeatured: false,
      isSpam: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(body as object),
    };
    db.campaigns.unshift(campaign);
    return ok({ campaign: publicCampaign(campaign) }, 201);
  }),

  http.get(u('/campaigns/:id'), ({ params }) => {
    const campaign = getDb().campaigns.find((c) => c._id === params.id);
    if (!campaign) return err(404, 'Campaign not found');
    return ok({ campaign: publicCampaign(campaign) });
  }),

  http.put(u('/campaigns/:id'), async ({ request, params }) => {
    const campaign = getDb().campaigns.find((c) => c._id === params.id);
    if (!campaign) return err(404, 'Campaign not found');
    Object.assign(campaign, (await request.json()) as object);
    return ok({ campaign: publicCampaign(campaign) });
  }),

  http.delete(u('/campaigns/:id'), ({ params }) => {
    const db = getDb();
    const idx = db.campaigns.findIndex((c) => c._id === params.id);
    if (idx === -1) return err(404, 'Campaign not found');
    db.campaigns.splice(idx, 1);
    db.applications = db.applications.filter((a) => a.campaignId !== params.id);
    return ok({ deleted: true, id: params.id });
  }),

  http.patch(u('/campaigns/:id/status'), async ({ request, params }) => {
    const campaign = getDb().campaigns.find((c) => c._id === params.id);
    if (!campaign) return err(404, 'Campaign not found');
    const { status } = (await request.json()) as { status: Campaign['status'] };
    campaign.status = status;
    return ok({ campaign: publicCampaign(campaign) });
  }),

  http.post(u('/campaigns/:id/apply'), async ({ request, params }) => {
    const viewer = viewerId(request);
    if (!viewer) return err(401, 'Authentication required');
    const db = getDb();
    const campaign = db.campaigns.find((c) => c._id === params.id);
    if (!campaign) return err(404, 'Campaign not found');
    if (campaign.status !== 'Active') {
      return err(409, `This campaign is ${campaign.status} and not accepting applications`);
    }
    const { profileId } = profileIdForUser(viewer);
    if (!profileId) return err(404, 'Create your creator profile before applying');
    if (db.applications.some((a) => a.campaignId === campaign._id && a.creatorId === profileId)) {
      return err(409, 'You have already applied to this campaign');
    }
    const { pitch } = (await request.json().catch(() => ({}))) as { pitch?: string };
    const application: Application = {
      _id: oid(`app-${Date.now()}`),
      campaignId: campaign._id,
      creatorId: profileId,
      businessId: campaign.businessId,
      pitch,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.applications.push(application);
    campaign.applicationsCount += 1;
    return ok({ application: { _id: application._id, status: application.status } }, 201);
  }),

  // ===== Applications =====
  http.get(u('/applications'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const url = new URL(request.url);
    const { role, profileId } = profileIdForUser(id);
    const db = getDb();
    let rows = [...db.applications];
    if (role === 'creator') rows = profileId ? rows.filter((a) => a.creatorId === profileId) : [];
    else if (role === 'business') rows = profileId ? rows.filter((a) => a.businessId === profileId) : [];
    const campaignId = url.searchParams.get('campaignId');
    if (campaignId) rows = rows.filter((a) => a.campaignId === campaignId);
    const status = csv(url.searchParams.get('status'));
    if (status.length) rows = rows.filter((a) => status.includes(a.status));
    rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const page = paginate(rows, url);
    return ok({ ...page, data: page.data.map(publicApplication) });
  }),

  http.get(u('/applications/:id'), ({ params }) => {
    const app = getDb().applications.find((a) => a._id === params.id);
    if (!app) return err(404, 'Application not found');
    return ok({ application: publicApplication(app) });
  }),

  http.patch(u('/applications/:id'), async ({ request, params }) => {
    const app = getDb().applications.find((a) => a._id === params.id);
    if (!app) return err(404, 'Application not found');
    if (app.status !== 'Pending') return err(409, 'Only pending applications can be decided');
    const { status, businessNote } = (await request.json()) as {
      status: 'Accepted' | 'Rejected';
      businessNote?: string;
    };
    app.status = status;
    if (businessNote) app.businessNote = businessNote;
    if (status === 'Accepted') {
      const campaign = getDb().campaigns.find((c) => c._id === app.campaignId);
      if (campaign && campaign.status === 'Active') campaign.status = 'Closed';
      app.conversationId = oid(`conv-live-${app._id}`);
    }
    return ok({ application: publicApplication(app) });
  }),

  http.post(u('/applications/:id/submit'), async ({ request, params }) => {
    const app = getDb().applications.find((a) => a._id === params.id);
    if (!app) return err(404, 'Application not found');
    const body = (await request.json()) as {
      submissionLink: string;
      submissionProof?: string;
      submissionNote?: string;
    };
    app.submissionLink = body.submissionLink;
    app.submissionProof = body.submissionProof;
    app.submissionNote = body.submissionNote;
    app.submittedAt = new Date().toISOString();
    if (app.status === 'Overdue') app.status = 'Accepted';
    return ok({ application: publicApplication(app) });
  }),

  http.post(u('/applications/:id/remind'), () => ok({ reminded: true })),

  http.post(u('/applications/:id/withdraw'), ({ params }) => {
    const app = getDb().applications.find((a) => a._id === params.id);
    if (!app) return err(404, 'Application not found');
    if (app.status !== 'Pending') return err(409, 'Only a pending application can be withdrawn');
    app.status = 'Withdrawn';
    const campaign = getDb().campaigns.find((c) => c._id === app.campaignId);
    if (campaign && campaign.applicationsCount > 0) campaign.applicationsCount -= 1;
    return ok({ application: publicApplication(app) });
  }),

  http.patch(u('/applications/:id/verify'), async ({ request, params }) => {
    const app = getDb().applications.find((a) => a._id === params.id);
    if (!app) return err(404, 'Application not found');
    const { action, note } = (await request.json()) as {
      action: 'verify' | 'revision' | 'fail';
      note?: string;
    };
    if (note) app.businessNote = note;
    if (action === 'verify') {
      app.status = 'Completed';
      app.verifiedAt = new Date().toISOString();
    } else if (action === 'revision') {
      app.submittedAt = undefined;
    } else {
      app.status = 'Cancelled';
    }
    return ok({ application: publicApplication(app) });
  }),

  // ===== Conversations =====
  http.get(u('/conversations'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const url = new URL(request.url);
    const db = getDb();
    const rows = db.conversations
      .filter((c) => c.businessUserId === id || c.creatorUserId === id)
      .map((c) => {
        const otherId = c.businessUserId === id ? c.creatorUserId : c.businessUserId;
        return { ...c, otherParticipant: userSummary(otherId) };
      })
      .sort((a, b) => +new Date(b.lastMessageAt ?? b.createdAt) - +new Date(a.lastMessageAt ?? a.createdAt));
    return ok(paginate(rows, url));
  }),

  http.get(u('/conversations/:id'), ({ request, params }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const c = getDb().conversations.find((x) => x._id === params.id);
    if (!c) return err(404, 'Conversation not found');
    const otherId = c.businessUserId === id ? c.creatorUserId : c.businessUserId;
    return ok({ conversation: { ...c, otherParticipant: userSummary(otherId) } });
  }),

  http.get(u('/conversations/:id/messages'), ({ params }) => {
    const messages = getDb()
      .messages.filter((m) => m.conversationId === params.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return ok({ messages });
  }),

  http.post(u('/conversations/:id/messages'), async ({ request, params }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const db = getDb();
    const c = db.conversations.find((x) => x._id === params.id);
    if (!c) return err(404, 'Conversation not found');
    const { body } = (await request.json()) as { body: string };
    const senderRole = db.users.find((x) => x._id === id)?.role ?? 'creator';
    const message = {
      _id: oid(`msg-${Date.now()}`),
      conversationId: c._id,
      senderUserId: id,
      senderRole,
      body,
      createdAt: new Date().toISOString(),
    };
    db.messages.push(message);
    c.lastMessage = body;
    c.lastMessageAt = message.createdAt;
    c.lastSenderUserId = id;
    return ok({ message }, 201);
  }),

  http.post(u('/conversations/:id/read'), ({ request, params }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const c = getDb().conversations.find((x) => x._id === params.id);
    if (!c) return err(404, 'Conversation not found');
    c.unreadCount = 0;
    const otherId = c.businessUserId === id ? c.creatorUserId : c.businessUserId;
    return ok({ conversation: { ...c, otherParticipant: userSummary(otherId) } });
  }),

  // ===== Notifications =====
  http.get(u('/notifications'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const url = new URL(request.url);
    const db = getDb();
    let rows = db.notifications.filter((n) => n.userId === id);
    const unreadCount = rows.filter((n) => !n.isRead).length;
    if (url.searchParams.get('unread') === 'true') rows = rows.filter((n) => !n.isRead);
    rows = [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return ok({ ...paginate(rows, url), unreadCount });
  }),

  http.patch(u('/notifications/read'), ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    let updated = 0;
    for (const n of getDb().notifications) {
      if (n.userId === id && !n.isRead) {
        n.isRead = true;
        updated += 1;
      }
    }
    return ok({ updated, unreadCount: 0 });
  }),

  // ===== Upload =====
  http.post(u('/upload/sign'), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { folder?: string; publicId?: string };
    return ok({
      signature: 'mock-signature',
      timestamp: Math.floor(Date.now() / 1000),
      apiKey: 'mock-api-key',
      cloudName: config.cloudinaryCloudName || 'demo',
      folder: body.folder,
      publicId: body.publicId,
    });
  }),

  // ===== Geocoding (unconfigured in mocks → graceful fallback) =====
  http.get(u('/geocoding/status'), () => ok({ configured: false })),
  http.get(u('/geocoding/search'), () => ok({ configured: false, result: null })),
  http.get(u('/geocoding/reverse'), () => ok({ configured: false, result: null })),

  // ===== Reports =====
  http.post(u('/reports'), async ({ request }) => {
    const id = viewerId(request);
    if (!id) return err(401, 'Authentication required');
    const body = (await request.json()) as {
      targetType: 'campaign' | 'business' | 'creator' | 'user';
      targetId: string;
      reason: string;
    };
    const report = {
      _id: oid(`report-${Date.now()}`),
      reporterId: id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      status: 'open' as const,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getDb().reports.push(report);
    return ok({ report }, 201);
  }),
];
