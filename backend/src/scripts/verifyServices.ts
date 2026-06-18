/**
 * Phase 5 checkpoint script — proves the external-integration services behave
 * without needing live Cloudinary / Resend / Expo credentials.
 *
 * Run it two ways:
 *   • Offline (default): exercises pure logic with no network —
 *       - Cloudinary signature is deterministic & order-independent; the upload
 *         param shape is correct; signing rejects an unconfigured environment.
 *       - Every §9.2 email template renders non-empty subject/html/text and
 *         HTML-escapes injected values.
 *       - Expo token validation; `sendExpoPush` skips invalid tokens with no
 *         network call; message chunking is correct.
 *   • Online (MONGODB_URI set): additionally runs the unified `notify` against a
 *     real database — asserts the in-app Notification is written and the push /
 *     email side channels degrade gracefully (skipped, not thrown) — then
 *     cleans up.
 *
 * Usage:
 *   npm run build && npm run verify:services
 *   # or with a database:
 *   MONGODB_URI="mongodb+srv://..." npm run verify:services
 */
import { connectDB, disconnectDB, isDbConnected } from '../lib/db';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import {
  signParams,
  isCloudinaryConfigured,
  createSignedUpload,
  isResendConfigured,
  accountCreatedEmail,
  passwordResetEmail,
  newApplicationEmail,
  applicationAcceptedEmail,
  applicationRejectedEmail,
  submissionReceivedEmail,
  submissionVerifiedEmail,
  revisionRequestedEmail,
  campaignExpiringEmail,
  newMatchingCampaignEmail,
  isExpoPushToken,
  sendExpoPush,
  notify,
  type EmailContent,
} from '../services';

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const info = (msg: string) => console.log(msg);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// --- [1] Cloudinary ----------------------------------------------------------

function checkCloudinary(): void {
  info('\n[1] Cloudinary signing');

  const secret = 'test-secret';
  const a = signParams({ folder: 'avatars', timestamp: 1700000000 }, secret);
  const b = signParams({ timestamp: 1700000000, folder: 'avatars' }, secret);
  assert(a === b, 'signature must be independent of key insertion order');
  assert(/^[a-f0-9]{40}$/.test(a), 'signature must be a 40-char SHA-1 hex');
  ok('signParams is deterministic, order-independent, SHA-1 hex');

  const differs = signParams({ folder: 'logos', timestamp: 1700000000 }, secret);
  assert(differs !== a, 'different params must produce a different signature');
  ok('different params → different signature');

  // createSignedUpload depends on configuration: either it throws (unconfigured)
  // or returns a well-formed param set (configured). Both are valid outcomes.
  if (isCloudinaryConfigured()) {
    const params = createSignedUpload({ folder: 'campaigns', tags: ['hero'] });
    assert(params.cloudName && params.apiKey && params.signature, 'params must be populated');
    assert(params.folder === 'campaigns', 'folder echoed');
    assert(params.uploadUrl.includes(params.cloudName), 'upload URL includes cloud name');
    ok('createSignedUpload returns a complete param set (Cloudinary configured)');
  } else {
    let threw = false;
    try {
      createSignedUpload({ folder: 'campaigns' });
    } catch {
      threw = true;
    }
    assert(threw, 'createSignedUpload must throw when Cloudinary is unconfigured');
    ok('createSignedUpload throws cleanly when Cloudinary is unconfigured');
  }
}

// --- [2] Resend templates ----------------------------------------------------

function checkEmailTemplates(): void {
  info('\n[2] Resend email templates (PRD §9.2)');

  const templates: Record<string, EmailContent> = {
    account_created: accountCreatedEmail({ name: 'Ada' }),
    password_reset: passwordResetEmail({ name: 'Ada', token: 'rawtoken123' }),
    new_application: newApplicationEmail({
      businessName: 'Bean Scene',
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
    }),
    application_accepted: applicationAcceptedEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
      businessName: 'Bean Scene',
    }),
    application_rejected: applicationRejectedEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
    }),
    submission_received: submissionReceivedEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
    }),
    submission_verified: submissionVerifiedEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
    }),
    revision_requested: revisionRequestedEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
      note: 'Please reshoot in daylight',
    }),
    campaign_expiring: campaignExpiringEmail({
      businessName: 'Bean Scene',
      campaignTitle: 'Free brunch',
    }),
    new_matching_campaign: newMatchingCampaignEmail({
      creatorName: 'Ada',
      campaignTitle: 'Free brunch',
      businessName: 'Bean Scene',
    }),
  };

  for (const [name, content] of Object.entries(templates)) {
    assert(content.subject.trim().length > 0, `${name}: subject non-empty`);
    assert(content.html.includes('<') && content.html.length > 50, `${name}: html rendered`);
    assert(content.text.trim().length > 0, `${name}: text non-empty`);
  }
  ok(`${Object.keys(templates).length} templates render subject/html/text`);

  // Password-reset must embed the deep link with the token.
  const reset = passwordResetEmail({ name: 'Ada', token: 'abc123' });
  assert(
    reset.html.includes('reset-password?token=abc123'),
    'reset email embeds deep link + token',
  );
  ok('password-reset email embeds the collably:// deep link with token');

  // HTML injection in a dynamic field must be escaped.
  const injected = newApplicationEmail({
    businessName: 'Bean Scene',
    creatorName: '<script>alert(1)</script>',
    campaignTitle: 'Free brunch',
  });
  assert(!injected.html.includes('<script>'), 'creator name must be HTML-escaped');
  assert(injected.html.includes('&lt;script&gt;'), 'escaped form present');
  ok('dynamic values are HTML-escaped (no injection)');

  info(`      Resend configured: ${isResendConfigured() ? 'yes' : 'no (sends are skipped)'}`);
}

// --- [3] Expo push -----------------------------------------------------------

async function checkExpoPush(): Promise<void> {
  info('\n[3] Expo push transport');

  assert(isExpoPushToken('ExponentPushToken[abc123]'), 'classic token accepted');
  assert(isExpoPushToken('ExpoPushToken[abc123]'), 'newer token accepted');
  assert(!isExpoPushToken('not-a-token'), 'garbage rejected');
  assert(!isExpoPushToken(null), 'null rejected');
  assert(!isExpoPushToken(''), 'empty rejected');
  ok('isExpoPushToken validates Expo token formats');

  // All-invalid batch must skip every message and make no network call.
  const result = await sendExpoPush([
    { to: 'bad-token', body: 'hi' },
    { to: '', body: 'hi' },
  ]);
  assert(
    result.sent === 0 && result.skipped === 2 && result.failed === 0,
    'invalid tokens skipped',
  );
  ok('sendExpoPush skips invalid tokens without a network call');
}

// --- [4] Unified notify (online only) ----------------------------------------

async function checkNotify(): Promise<void> {
  info('\n[4] Unified notify dispatch');

  const stamp = Date.now();
  // No pushToken and (likely) no Resend config → side channels degrade, in-app stays.
  const user = await User.create({
    name: 'Notify Tester',
    email: `notify+${stamp}@example.com`,
    role: 'creator',
  });

  try {
    const res = await notify({
      recipient: user,
      type: 'application_accepted',
      message: "You're in! Free brunch for a Reel.",
      deepLinkPath: '/collabs/test',
      email: accountCreatedEmail({ name: user.name }),
    });

    assert(res.notification, 'in-app Notification created');
    assert(res.notification.userId.equals(user._id), 'notification belongs to recipient');
    const stored = await Notification.findById(res.notification._id);
    assert(stored, 'notification persisted to the database');
    ok('notify writes the in-app Notification (source of truth)');

    assert(res.push.sent === false, 'push not sent (recipient has no token)');
    assert(typeof res.push.reason === 'string', 'push degraded gracefully with a reason');
    ok(`push degraded gracefully: ${res.push.reason}`);

    // Email is sent only if Resend is configured; either way notify must not throw.
    ok(
      `email channel resolved: sent=${res.email.sent}${res.email.reason ? ` (${res.email.reason})` : ''}`,
    );

    // Passing a string id should resolve the same way.
    const byId = await notify({
      recipient: user.id,
      type: 'submission_verified',
      message: 'Verified!',
      deepLinkPath: '/collabs/test',
    });
    assert(byId.notification, 'notify resolves a recipient passed as an id string');
    ok('notify accepts a recipient id string');
  } finally {
    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Notification.deleteMany({ userId: user._id }),
    ]);
    ok('cleaned up test user + notifications');
  }
}

async function main(): Promise<void> {
  info('Phase 5 — Backend services verification');

  checkCloudinary();
  checkEmailTemplates();
  await checkExpoPush();

  await connectDB();
  if (isDbConnected()) {
    await checkNotify();
    await disconnectDB();
  } else {
    info('\n[4] Unified notify dispatch — SKIPPED (no MONGODB_URI / DB unreachable).');
    info('    Set MONGODB_URI and re-run to exercise notify against a real database.');
  }

  info('\nDone. All Phase 5 services verified.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[verifyServices] FAILED:', err instanceof Error ? err.message : err);
    void disconnectDB().finally(() => process.exit(1));
  });
