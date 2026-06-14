/**
 * Fake axios adapter that serves `lib/mockData` so the whole app runs with no
 * backend (dev/showcase mode — toggled by `USE_MOCKS` in `lib/env`). It routes by
 * method + path, applies the same query params the screens send (mine / businessId
 * / campaignId / status / search / pagination), and MUTATES the seed arrays in
 * place so writes — apply, accept/reject, submit, verify, status changes, profile
 * edits — persist for the session and feel real.
 *
 * Wired in `lib/api`: when mocks are on we set `api.defaults.adapter` to this, so
 * every existing `api.get/post/...` call transparently resolves against the demo
 * world. Turn it off with `EXPO_PUBLIC_USE_MOCKS=false` to hit a real server.
 */
import type { AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { AuthPayload } from '@/store/authStore';
import type { Application, Campaign, PublicUser } from '@/types';
import type { UserRole } from '@/constants';
import {
  applications,
  businessProfileById,
  businessProfileByUser,
  businessProfiles,
  campaignById,
  campaigns,
  creatorProfileById,
  creatorProfileByUser,
  creatorProfiles,
  iso,
  ME_ADMIN_USER,
  ME_BUSINESS_PROFILE,
  ME_BUSINESS_USER,
  ME_CREATOR_PROFILE,
  ME_CREATOR_USER,
  notifications,
  reports,
  summaryOf,
  userById,
  users,
  withBusiness,
  withRefs,
} from './mockData';

const TOKEN_PREFIX = 'mock-token.';
const tokenFor = (userId: string) => `${TOKEN_PREFIX}${userId}`;

/** Resolve the acting user from the request's bearer token. Defaults to the demo creator. */
function whoamiId(config: InternalAxiosRequestConfig): string {
  const h = config.headers as AxiosHeaders | Record<string, unknown> | undefined;
  let auth: unknown;
  if (h && typeof (h as AxiosHeaders).get === 'function') auth = (h as AxiosHeaders).get('Authorization');
  else if (h) auth = (h as Record<string, unknown>).Authorization ?? (h as Record<string, unknown>).authorization;
  const raw = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';
  if (raw.startsWith(TOKEN_PREFIX)) {
    const id = raw.slice(TOKEN_PREFIX.length);
    if (userById(id)) return id;
  }
  return ME_CREATOR_USER;
}

/** Map a login email to one of the demo identities so profiles always resolve. */
function identityForLogin(email: string): string {
  const e = email.toLowerCase();
  if (e.includes('admin')) return ME_ADMIN_USER;
  if (e.includes('business') || e.includes('biz') || e.includes('brand') || e.includes('saffron')) return ME_BUSINESS_USER;
  return ME_CREATOR_USER;
}

const identityForRole = (role?: UserRole): string =>
  role === 'business' ? ME_BUSINESS_USER : role === 'admin' ? ME_ADMIN_USER : ME_CREATOR_USER;

function authPayload(userId: string, overrides?: Partial<PublicUser>): AuthPayload {
  const base = userById(userId)!;
  const user: PublicUser = { ...base, ...overrides };
  return { user, accessToken: tokenFor(userId), refreshToken: `mock-refresh.${userId}` };
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
type Params = Record<string, unknown>;
const param = (p: Params | undefined, key: string): string | undefined => {
  const v = p?.[key];
  return v == null ? undefined : String(v);
};
const num = (v: string | undefined, dflt: number) => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : dflt;
};
function body<T = Record<string, unknown>>(config: InternalAxiosRequestConfig): T {
  const d = config.data;
  if (typeof d === 'string') {
    try {
      return JSON.parse(d) as T;
    } catch {
      return {} as T;
    }
  }
  return (d ?? {}) as T;
}

function response<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'OK',
    headers: {},
    config,
  } as AxiosResponse<T>;
}

/** Reject the way the response interceptor expects (an AxiosError-ish with response). */
function fail(config: InternalAxiosRequestConfig, status: number, message: string): Promise<never> {
  const err = new Error(message) as Error & { isAxiosError: boolean; config: unknown; response: unknown };
  err.isAxiosError = true;
  err.config = config;
  err.response = { status, data: { message }, headers: {}, config, statusText: '' };
  return Promise.reject(err);
}

// ── the adapter ──────────────────────────────────────────────────────────────
export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  // Small latency so loading states are visible (and the UI feels real).
  await new Promise((r) => setTimeout(r, 220));

  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0];
  const params = config.params as Params | undefined;
  const me = whoamiId(config);
  const meUser = userById(me)!;

  // ===== AUTH ===================================================================
  if (method === 'post' && url === '/auth/login') {
    const { email } = body<{ email?: string }>(config);
    const id = identityForLogin(email ?? '');
    return response(config, authPayload(id, { isOnboarded: true }));
  }
  if (method === 'post' && url === '/auth/register') {
    const b = body<{ name?: string; email?: string; role?: UserRole }>(config);
    const id = identityForRole(b.role);
    // New account → not yet onboarded, so the onboarding flow shows.
    return response(config, authPayload(id, { name: b.name || undefined, email: b.email || undefined, isOnboarded: false }));
  }
  if (method === 'post' && url === '/auth/google') {
    const b = body<{ role?: UserRole }>(config);
    return response(config, authPayload(identityForRole(b.role), { isOnboarded: true }));
  }
  if (method === 'get' && url === '/auth/me') {
    return response(config, { user: meUser });
  }
  if (method === 'patch' && url === '/auth/email') {
    const { email } = body<{ email?: string }>(config);
    if (email) meUser.email = email;
    return response(config, { user: meUser });
  }
  if (method === 'patch' && url === '/auth/password') return response(config, { message: 'Password updated.' });
  if (method === 'post' && url === '/auth/forgot-password') {
    return response(config, { message: 'If that email exists, a reset link is on its way.', devResetToken: 'demo-reset-token' });
  }
  if (method === 'post' && url === '/auth/reset-password') {
    return response(config, authPayload(ME_CREATOR_USER, { isOnboarded: true }));
  }

  // ===== PROFILES ===============================================================
  if (method === 'get' && url === '/profile/creator') {
    return response(config, { profile: creatorProfileByUser(me) ?? creatorProfiles[0] });
  }
  if (method === 'get' && url === '/profile/business') {
    return response(config, { profile: businessProfileByUser(me) ?? businessProfiles[0] });
  }
  if (method === 'get' && url.startsWith('/profile/creator/')) {
    const id = url.split('/').pop()!;
    const profile = creatorProfileById(id) ?? creatorProfiles[0];
    return response(config, { profile, user: summaryOf(profile.userId) });
  }
  if (method === 'get' && url.startsWith('/profile/business/')) {
    const id = url.split('/').pop()!;
    const profile = businessProfileById(id) ?? businessProfiles[0];
    return response(config, { profile, user: summaryOf(profile.userId) });
  }
  if (method === 'put' && url === '/profile/creator') {
    const existing = creatorProfileByUser(me);
    const patch = body(config);
    if (existing) Object.assign(existing, patch);
    return response(config, { profile: existing ?? { ...creatorProfiles[0], ...patch } });
  }
  if (method === 'put' && url === '/profile/business') {
    const existing = businessProfileByUser(me);
    const patch = body(config);
    if (existing) Object.assign(existing, patch);
    return response(config, { profile: existing ?? { ...businessProfiles[0], ...patch } });
  }

  // ===== CAMPAIGNS ==============================================================
  if (method === 'get' && url === '/campaigns') {
    let list = campaigns.slice();
    const mine = param(params, 'mine');
    const businessId = param(params, 'businessId');
    const search = param(params, 'search')?.toLowerCase();
    const category = param(params, 'category');
    const status = param(params, 'status');

    if (mine === 'true') list = list.filter((c) => c.businessId === (businessProfileByUser(me)?._id ?? ME_BUSINESS_PROFILE));
    else if (businessId) list = list.filter((c) => c.businessId === businessId);
    else list = list.filter((c) => c.status === 'Active' && !c.isSpam); // public explore feed

    if (status) list = list.filter((c) => c.status === status);
    if (category && category !== 'All') list = list.filter((c) => c.category === category);
    if (search) {
      list = list.filter(
        (c) => c.title.toLowerCase().includes(search) || c.description.toLowerCase().includes(search) || c.tags.some((t) => t.includes(search)),
      );
    }
    // Featured first, then newest.
    list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt));

    const page = num(param(params, 'page'), 1);
    const limit = num(param(params, 'limit'), 10);
    const total = list.length;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit).map(withBusiness);
    return response(config, { data, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  }
  if (method === 'post' && url === '/campaigns') {
    const b = body<Partial<Campaign>>(config);
    const bizId = businessProfileByUser(me)?._id ?? ME_BUSINESS_PROFILE;
    const created: Campaign = {
      _id: `c-${Date.now()}`,
      businessId: bizId,
      title: b.title ?? 'Untitled campaign',
      description: b.description ?? '',
      category: b.category ?? 'Other',
      isRemote: b.isRemote ?? true,
      location: b.location,
      reward: b.reward ?? { type: 'Product', description: 'Reward' },
      deliverables: b.deliverables ?? [],
      deadline: b.deadline ?? iso(21),
      spotsTotal: b.spotsTotal ?? 5,
      spotsRemaining: b.spotsRemaining ?? b.spotsTotal ?? 5,
      minFollowers: b.minFollowers ?? 0,
      status: b.status ?? 'Draft',
      tags: b.tags ?? [],
      coverImage: b.coverImage ?? null,
      applicationsCount: 0,
      isFeatured: false,
      isSpam: false,
      createdAt: iso(0),
    };
    campaigns.unshift(created);
    return response(config, { campaign: created }, 201);
  }
  if (url.startsWith('/campaigns/')) {
    const rest = url.slice('/campaigns/'.length);
    const [id, action] = rest.split('/');
    const campaign = campaignById(id);
    if (method === 'get') {
      if (!campaign) return fail(config, 404, 'Campaign not found.');
      return response(config, { campaign: withBusiness(campaign) });
    }
    if (method === 'patch' && action === 'status') {
      const { status } = body<{ status?: Campaign['status'] }>(config);
      if (campaign && status) campaign.status = status;
      return response(config, { campaign: campaign ? withBusiness(campaign) : undefined });
    }
    if (method === 'put') {
      if (campaign) Object.assign(campaign, body(config));
      return response(config, { campaign: campaign ? withBusiness(campaign) : undefined });
    }
    if (method === 'post' && action === 'apply') {
      const creatorId = creatorProfileByUser(me)?._id ?? ME_CREATOR_PROFILE;
      const { pitch } = body<{ pitch?: string }>(config);
      const app: Application = {
        _id: `a-${Date.now()}`,
        campaignId: id,
        creatorId,
        businessId: campaign?.businessId ?? ME_BUSINESS_PROFILE,
        status: 'Pending',
        pitch,
        createdAt: iso(0),
      };
      applications.unshift(app);
      if (campaign) campaign.applicationsCount += 1;
      return response(config, { application: withRefs(app) }, 201);
    }
    if (method === 'delete') {
      const i = campaigns.findIndex((c) => c._id === id);
      if (i >= 0) campaigns.splice(i, 1);
      return response(config, { message: 'Deleted.' });
    }
  }

  // ===== APPLICATIONS ===========================================================
  if (method === 'get' && url === '/applications') {
    let list = applications.slice();
    const campaignId = param(params, 'campaignId');
    const status = param(params, 'status');
    if (campaignId) {
      list = list.filter((a) => a.campaignId === campaignId);
    } else if (meUser.role === 'business') {
      const bizId = businessProfileByUser(me)?._id ?? ME_BUSINESS_PROFILE;
      list = list.filter((a) => a.businessId === bizId);
    } else {
      const creatorId = creatorProfileByUser(me)?._id ?? ME_CREATOR_PROFILE;
      list = list.filter((a) => a.creatorId === creatorId);
    }
    if (status) {
      const allowed = status.split(',').map((s) => s.trim());
      list = list.filter((a) => allowed.includes(a.status));
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = num(param(params, 'limit'), list.length);
    return response(config, { data: list.slice(0, limit).map(withRefs) });
  }
  if (url.startsWith('/applications/')) {
    const rest = url.slice('/applications/'.length);
    const [id, action] = rest.split('/');
    const app = applications.find((a) => a._id === id);
    if (method === 'get') {
      if (!app) return fail(config, 404, 'Application not found.');
      return response(config, { application: withRefs(app) });
    }
    if (method === 'patch' && !action) {
      // Business accept / reject.
      const { status } = body<{ status?: Application['status'] }>(config);
      if (app && status) {
        app.status = status;
        app.updatedAt = iso(0);
      }
      return response(config, { application: app ? withRefs(app) : undefined });
    }
    if (method === 'patch' && action === 'verify') {
      const { action: verdict, note } = body<{ action?: string; note?: string }>(config);
      if (app) {
        app.status = verdict === 'reject' ? 'Accepted' : 'Completed';
        app.verifiedAt = iso(0);
        app.verifiedBy = me;
        if (note) app.businessNote = note;
        app.updatedAt = iso(0);
      }
      return response(config, { application: app ? withRefs(app) : undefined });
    }
    if (method === 'post' && action === 'submit') {
      const b = body<{ submissionLink?: string; submissionProof?: string; submissionNote?: string }>(config);
      if (app) {
        app.submissionLink = b.submissionLink;
        app.submissionProof = b.submissionProof;
        app.submissionNote = b.submissionNote;
        app.submittedAt = iso(0);
        app.updatedAt = iso(0);
      }
      return response(config, { application: app ? withRefs(app) : undefined });
    }
    if (method === 'post' && action === 'withdraw') {
      if (app) {
        app.status = 'Withdrawn';
        app.updatedAt = iso(0);
      }
      return response(config, { application: app ? withRefs(app) : undefined });
    }
    if (method === 'post' && action === 'remind') return response(config, { message: 'Reminder sent.' });
  }

  // ===== NOTIFICATIONS ==========================================================
  if (method === 'get' && url === '/notifications') {
    const mine = notifications.filter((n) => n.userId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = num(param(params, 'limit'), mine.length);
    const unreadCount = mine.filter((n) => !n.isRead).length;
    return response(config, { data: mine.slice(0, limit), unreadCount });
  }
  if (method === 'patch' && url === '/notifications/read') {
    notifications.forEach((n) => {
      if (n.userId === me) n.isRead = true;
    });
    return response(config, { message: 'All marked read.' });
  }

  // ===== PUSH / UPLOAD (no-ops) =================================================
  if (url === '/push/register' || url === '/push/token') return response(config, { ok: true });
  if (url === '/upload/sign') {
    return response(config, { signature: 'demo', timestamp: Date.now(), apiKey: 'demo', cloudName: 'demo', folder: 'demo' });
  }

  // ===== ADMIN ==================================================================
  if (method === 'get' && url === '/admin/dashboard') {
    const creators = users.filter((u) => u.role === 'creator').length;
    const biz = users.filter((u) => u.role === 'business').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return response(config, {
      users: { total: users.length, businesses: biz, creators, admins },
      campaigns: { total: campaigns.length, active: campaigns.filter((c) => c.status === 'Active').length },
      applications: { total: applications.length, today: applications.filter((a) => a.createdAt >= iso(-1)).length },
      collabsCompleted: applications.filter((a) => a.status === 'Completed').length,
      signups: { today: 2, thisWeek: 9 },
      openReports: reports.filter((r) => r.status === 'open').length,
    });
  }
  if (method === 'get' && url === '/admin/creators') {
    const search = param(params, 'search')?.toLowerCase();
    let list = creatorProfiles.map((p) => ({ ...p, user: summaryOf(p.userId) }));
    if (search) list = list.filter((p) => p.user?.name.toLowerCase().includes(search));
    return response(config, { data: list });
  }
  if (method === 'get' && url === '/admin/businesses') {
    const search = param(params, 'search')?.toLowerCase();
    let list = businessProfiles.map((p) => ({ ...p, user: summaryOf(p.userId) }));
    if (search) list = list.filter((p) => p.businessName.toLowerCase().includes(search));
    return response(config, { data: list });
  }
  if (method === 'get' && url === '/admin/campaigns') {
    const status = param(params, 'status');
    const flagged = param(params, 'flagged');
    let list = campaigns.map(withBusiness);
    if (status) list = list.filter((c) => c.status === status);
    if (flagged === 'true') list = list.filter((c) => c.isSpam);
    return response(config, { data: list });
  }
  if (method === 'get' && url === '/admin/users') {
    const role = param(params, 'role');
    const search = param(params, 'search')?.toLowerCase();
    let list = users.slice();
    if (role && role !== 'all') list = list.filter((u) => u.role === role);
    if (search) list = list.filter((u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    return response(config, { data: list });
  }
  if (method === 'get' && url === '/admin/reports') {
    const status = param(params, 'status');
    let list = reports.slice();
    if (status && status !== 'all') list = list.filter((r) => r.status === status);
    return response(config, { data: list });
  }
  if (method === 'patch' && url.startsWith('/admin/creators/')) {
    const id = url.split('/').pop()!;
    const p = creatorProfileById(id);
    if (p) Object.assign(p, body(config));
    return response(config, { profile: p });
  }
  if (method === 'patch' && url.startsWith('/admin/businesses/')) {
    const id = url.split('/').pop()!;
    const p = businessProfileById(id);
    if (p) Object.assign(p, body(config));
    return response(config, { profile: p });
  }
  if (method === 'patch' && url.startsWith('/admin/campaigns/')) {
    const id = url.split('/').pop()!;
    const c = campaignById(id);
    if (c) Object.assign(c, body(config));
    return response(config, { campaign: c });
  }
  if (method === 'patch' && url.startsWith('/admin/users/')) {
    const id = url.split('/').pop()!;
    const u = userById(id);
    if (u) Object.assign(u, body(config));
    return response(config, { user: u });
  }
  if (method === 'patch' && url.startsWith('/admin/reports/')) {
    const id = url.split('/').pop()!;
    const r = reports.find((x) => x._id === id);
    const { status } = body<{ status?: string }>(config);
    if (r && status) {
      r.status = status as typeof r.status;
      r.resolvedBy = me;
      r.resolvedAt = iso(0);
    }
    return response(config, { report: r });
  }
  if (method === 'delete' && url.startsWith('/admin/')) {
    return response(config, { message: 'Deleted.' });
  }

  // ===== FALLBACK ===============================================================
  // Unknown route — return an empty success so a screen never hard-crashes.
  if (__DEV__) console.warn(`[mockApi] unhandled ${method.toUpperCase()} ${url}`);
  return response(config, { data: [] });
}
