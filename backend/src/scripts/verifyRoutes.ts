/**
 * Phase 6 checkpoint script — verifies the API routes behave end-to-end.
 *
 * Two passes (mirrors verifyAuth / verifyServices):
 *   • Offline (no DB): unit-checks the shared request helpers — ObjectId param
 *     validation, pagination parse/clamp, and the paginated envelope.
 *   • Online (MONGODB_URI set): boots the real Express app on an ephemeral port
 *     and drives the full collab lifecycle with fetch —
 *       business+creator register → profiles → create+publish campaign →
 *       discovery list → apply (+ double-apply 409) → accept (spot consumed) →
 *       submit → verify (counters bump) → notifications → push register/remove →
 *       admin dashboard + moderation — then deletes everything it created.
 *
 * Usage:
 *   npm run build && npm run verify:routes
 *   MONGODB_URI="mongodb+srv://..." npm run verify:routes
 */
import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { connectDB, disconnectDB, isDbConnected } from '../lib/db';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import { signAccessToken } from '../lib/jwt';
import { hashPassword } from '../lib/password';
import {
  User,
  BusinessProfile,
  CreatorProfile,
  Campaign,
  Application,
  Notification,
  Report,
} from '../models';

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const info = (msg: string) => console.log(msg);

// --- Offline -----------------------------------------------------------------

function verifyHelpers(): void {
  info('\n[1] Offline request helpers');

  assert.throws(() => objectIdParam('not-an-id'), /Invalid id/, 'rejects malformed id');
  assert.throws(() => objectIdParam(undefined), /Invalid id/, 'rejects missing id');
  assert.strictEqual(
    objectIdParam('507f1f77bcf86cd799439011'),
    '507f1f77bcf86cd799439011',
    'accepts a valid ObjectId',
  );
  ok('objectIdParam validates ObjectIds');

  const def = parsePagination({});
  assert(def.page === 1 && def.limit === 20 && def.skip === 0, 'pagination defaults');
  const p3 = parsePagination({ page: '3', limit: '10' });
  assert(p3.page === 3 && p3.limit === 10 && p3.skip === 20, 'pagination computes skip');
  const clamped = parsePagination({ page: '1', limit: '9999' });
  assert(clamped.limit === 50, 'limit clamps to 50');
  ok('parsePagination parses, computes skip, and clamps');

  const env = paginated([1, 2, 3], 7, parsePagination({ page: '1', limit: '3' }));
  assert(env.total === 7 && env.totalPages === 3 && env.data.length === 3, 'paginated envelope');
  ok('paginated builds the list envelope');
}

// --- Online ------------------------------------------------------------------

interface Json {
  [k: string]: unknown;
}

async function verifyHttpFlow(): Promise<void> {
  info('\n[2] Online HTTP flow (full collab lifecycle + admin)');

  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/api`;

  const stamp = Date.now();
  const emails = {
    business: `routes-biz+${stamp}@example.com`,
    creator: `routes-crt+${stamp}@example.com`,
    admin: `routes-adm+${stamp}@example.com`,
  };
  const createdUserIds: string[] = [];

  const call = async (method: string, path: string, opts: { body?: Json; token?: string } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Json };
  };

  try {
    // Register a business + a creator via the auth routes.
    const bizReg = await call('POST', '/auth/register', {
      body: {
        name: 'Route Biz',
        email: emails.business,
        password: 'Password123',
        role: 'business',
      },
    });
    assert(bizReg.status === 201, 'business registered');
    const bizToken = bizReg.body.accessToken as string;
    createdUserIds.push((bizReg.body.user as Json)._id as string);

    const crtReg = await call('POST', '/auth/register', {
      body: { name: 'Route Crt', email: emails.creator, password: 'Password123', role: 'creator' },
    });
    assert(crtReg.status === 201, 'creator registered');
    const crtToken = crtReg.body.accessToken as string;
    createdUserIds.push((crtReg.body.user as Json)._id as string);
    ok('registered a business + a creator');

    // Profiles (upsert via PUT, which also marks the user onboarded).
    const bizProfile = await call('PUT', '/profile/business', {
      token: bizToken,
      body: { businessName: 'Route Cafe', category: 'Cafe', location: { city: 'Toronto' } },
    });
    assert(bizProfile.status === 201, 'business profile created (201)');
    const crtProfile = await call('PUT', '/profile/creator', {
      token: crtToken,
      body: {
        bio: 'Foodie',
        niche: ['Food', 'Lifestyle'],
        location: { city: 'Toronto' },
        socialHandles: { instagram: { handle: '@routecrt', followerCount: 12000 } },
        contentTypes: ['Reel'],
      },
    });
    assert(crtProfile.status === 201, 'creator profile created (201)');
    // GET own profile.
    const getBiz = await call('GET', '/profile/business', { token: bizToken });
    assert(getBiz.status === 200, 'GET own business profile');
    ok('profiles: PUT upsert (201) + GET own');

    // Role guard: a creator cannot create a campaign.
    const forbidden = await call('POST', '/campaigns', {
      token: crtToken,
      body: {
        title: 'x',
        description: 'y',
        category: 'Cafe',
        reward: { type: 'Product', description: 'z' },
      },
    });
    assert(forbidden.status === 403, 'creator blocked from POST /campaigns');
    ok('role guard: creator → 403 on POST /campaigns');

    // Create a campaign as a Draft, then publish it.
    const created = await call('POST', '/campaigns', {
      token: bizToken,
      body: {
        title: 'Free Brunch Reel',
        description: 'Brunch on us for a Reel.',
        category: 'Cafe',
        reward: { type: 'Experience', description: 'Brunch for two', estimatedValue: 80 },
        deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }],
        minFollowers: 1000,
        tags: ['Food', 'Lifestyle'],
        location: { city: 'Toronto' },
        status: 'Draft',
      },
    });
    assert(created.status === 201, 'campaign created');
    const campaignId = (created.body.campaign as Json)._id as string;

    // Guests can't see a Draft in discovery.
    const draftList = await call('GET', `/campaigns?q=Free Brunch Reel`);
    assert((draftList.body.data as Json[]).length === 0, 'draft hidden from public discovery');

    const published = await call('PATCH', `/campaigns/${campaignId}/status`, {
      token: bizToken,
      body: { status: 'Active' },
    });
    assert(published.status === 200, 'campaign published (Draft→Active)');

    // Illegal transition is rejected.
    const illegal = await call('PATCH', `/campaigns/${campaignId}/status`, {
      token: bizToken,
      body: { status: 'Draft' },
    });
    assert(illegal.status === 409, 'illegal status transition → 409');
    ok('campaign: create draft → publish → illegal transition 409');

    // Now visible publicly (guest).
    const liveList = await call('GET', `/campaigns?q=Free Brunch Reel`);
    assert((liveList.body.data as Json[]).length === 1, 'active campaign visible to guests');
    ok('discovery: active campaign visible to guests');

    // Creator applies; second apply is a 409.
    const apply = await call('POST', `/campaigns/${campaignId}/apply`, {
      token: crtToken,
      body: { pitch: 'Local foodie!' },
    });
    assert(apply.status === 201, 'creator applied (201)');
    const applicationId = (apply.body.application as Json)._id as string;
    const dupApply = await call('POST', `/campaigns/${campaignId}/apply`, {
      token: crtToken,
      body: { pitch: 'again' },
    });
    assert(dupApply.status === 409, 'double-apply blocked (409)');
    ok('apply: 201 then double-apply 409');

    // Business lists applications, then accepts (auto-closes the campaign).
    const bizApps = await call('GET', '/applications', { token: bizToken });
    assert((bizApps.body.data as Json[]).length === 1, 'business sees the application');
    const accept = await call('PATCH', `/applications/${applicationId}`, {
      token: bizToken,
      body: { status: 'Accepted' },
    });
    assert(accept.status === 200, 'application accepted');
    const afterAccept = await call('GET', `/campaigns/${campaignId}`);
    assert(
      (afterAccept.body.campaign as Json).status === 'Closed',
      'campaign auto-closed on first approval',
    );
    ok('accept: 200 + campaign auto-closed (Active→Closed)');

    // Creator submits, business verifies → Completed + counters bump.
    const submit = await call('POST', `/applications/${applicationId}/submit`, {
      token: crtToken,
      body: { submissionLink: 'https://instagram.com/p/abc', submissionNote: 'done' },
    });
    assert(submit.status === 200, 'creator submitted content');
    const verify = await call('PATCH', `/applications/${applicationId}/verify`, {
      token: bizToken,
      body: { action: 'verify' },
    });
    assert(verify.status === 200, 'submission verified');
    assert(
      (verify.body.application as Json).status === 'Completed',
      'application is Completed after verify',
    );
    const crtProfileAfter = await call('GET', '/profile/creator', { token: crtToken });
    assert(
      (crtProfileAfter.body.profile as Json).totalCollabsCompleted === 1,
      'creator completion counter bumped',
    );
    ok('submit → verify → Completed + counters bumped');

    // Notifications exist for the creator (accepted + verified).
    const notifs = await call('GET', '/notifications', { token: crtToken });
    assert((notifs.body.unreadCount as number) >= 1, 'creator has unread notifications');
    const markRead = await call('PATCH', '/notifications/read', { token: crtToken });
    assert(markRead.status === 200 && markRead.body.unreadCount === 0, 'mark-all-read works');
    ok('notifications: feed + unread count + mark-all-read');

    // Push token register + remove.
    const reg = await call('POST', '/push/register', {
      token: crtToken,
      body: { pushToken: 'ExponentPushToken[routes-test]' },
    });
    assert(reg.status === 200, 'push token registered');
    const badPush = await call('POST', '/push/register', {
      token: crtToken,
      body: { pushToken: 'not-a-token' },
    });
    assert(badPush.status === 400, 'invalid push token rejected');
    const del = await call('DELETE', '/push/token', { token: crtToken });
    assert(del.status === 200, 'push token removed');
    ok('push: register (+reject bad) + remove');

    // File a report as the creator.
    const report = await call('POST', '/reports', {
      token: crtToken,
      body: { targetType: 'campaign', targetId: campaignId, reason: 'Test report' },
    });
    assert(report.status === 201, 'report filed');
    ok('reports: file → 201');

    // Admin (seeded directly, then a signed token) drives the moderation routes.
    const adminUser = await User.create({
      name: 'Route Admin',
      email: emails.admin,
      passwordHash: await hashPassword('Password123'),
      role: 'admin',
      isVerified: true,
      isOnboarded: true,
    });
    createdUserIds.push(adminUser.id);
    const adminToken = signAccessToken(adminUser.id, 'admin');

    const dash = await call('GET', '/admin/dashboard', { token: adminToken });
    assert(
      dash.status === 200 && ((dash.body.users as Json).total as number) >= 3,
      'admin dashboard stats',
    );
    const adminCampaigns = await call('GET', '/admin/campaigns', { token: adminToken });
    assert((adminCampaigns.body.data as Json[]).length >= 1, 'admin lists all campaigns');
    const adminReports = await call('GET', '/admin/reports?status=open', { token: adminToken });
    assert((adminReports.body.data as Json[]).length >= 1, 'admin lists open reports');

    // Non-admin is blocked from admin routes.
    const blocked = await call('GET', '/admin/dashboard', { token: bizToken });
    assert(blocked.status === 403, 'non-admin blocked from /admin');
    ok('admin: dashboard + lists, non-admin → 403');

    // Ban the creator → their token stops working (403).
    const crtUserId = createdUserIds[1];
    const ban = await call('PATCH', `/admin/users/${crtUserId}`, {
      token: adminToken,
      body: { isBanned: true },
    });
    assert(ban.status === 200, 'admin banned the creator');
    const afterBan = await call('GET', '/profile/creator', { token: crtToken });
    assert(afterBan.status === 403, 'banned user is rejected by authenticate');
    ok('admin ban: banned user → 403 on authenticated routes');
  } finally {
    // Clean up everything this run created.
    const businessProfiles = await BusinessProfile.find({
      userId: { $in: createdUserIds },
    }).select('_id');
    const creatorProfiles = await CreatorProfile.find({
      userId: { $in: createdUserIds },
    }).select('_id');
    const bizIds = businessProfiles.map((p) => p._id);
    const crtIds = creatorProfiles.map((p) => p._id);

    await Promise.all([
      Application.deleteMany({
        $or: [{ businessId: { $in: bizIds } }, { creatorId: { $in: crtIds } }],
      }),
      Campaign.deleteMany({ businessId: { $in: bizIds } }),
      BusinessProfile.deleteMany({ userId: { $in: createdUserIds } }),
      CreatorProfile.deleteMany({ userId: { $in: createdUserIds } }),
      Notification.deleteMany({ userId: { $in: createdUserIds } }),
      Report.deleteMany({ reporterId: { $in: createdUserIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main(): Promise<void> {
  info('Phase 6 — API routes verification');

  verifyHelpers();

  await connectDB();
  const ranHttp = isDbConnected();
  if (ranHttp) {
    await verifyHttpFlow();
    await disconnectDB();
  } else {
    info('\n[2] Online HTTP flow — SKIPPED (no MONGODB_URI / DB unreachable).');
    info('    Set MONGODB_URI and re-run to exercise the full route surface.');
  }

  info('\nDone. Route helpers verified' + (ranHttp ? ' + full HTTP flow passed.' : '.'));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[verifyRoutes] FAILED:', err instanceof Error ? err.message : err);
    void disconnectDB().finally(() => process.exit(1));
  });
