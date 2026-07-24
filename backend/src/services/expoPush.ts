/**
 * Expo Push + unified notification dispatch (PRD §9.1–§9.3, §17).
 *
 * Two layers live here:
 *   1. `sendExpoPush` — the raw transport to the Expo Push API
 *      (`https://exp.host/--/api/v2/push/send`), with token validation and
 *      100-message chunking. Best-effort: it never throws.
 *   2. `notify` — the one call routes use for every §9.2 trigger. It **creates
 *      the in-app Notification doc, sends the push, and sends the email** in a
 *      single step, honouring the recipient's channel preferences.
 *
 * The in-app Notification is the source of truth and is always written; push and
 * email are best-effort side channels whose failures are logged, not thrown, so
 * a downed provider can't break an accept/reject/submit flow.
 */
import { env } from '../lib/env';
import { emitToUser } from '../lib/realtime';
import { User, type UserDoc } from '../models/User';
import { Notification, type NotificationDoc } from '../models/Notification';
import type { NotificationType } from '../../../shared/types/Notification';
import { sendEmail, type EmailContent, type SendEmailResult } from './resend';
import { toPublicNotification } from '../lib/serialize';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
const PUSH_CHUNK_SIZE = 100;
const APP_NAME = 'Local Creator Crew';

/** A single message in the Expo Push API shape. */
export interface ExpoPushMessage {
  to: string;
  title?: string;
  body: string;
  /** Arbitrary payload delivered on tap; we put the deep-link target here. */
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

export interface PushResult {
  sent: boolean;
  reason?: string;
}

/**
 * Validate an Expo push token. Expo tokens look like
 * `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` (or the newer `ExpoPushToken[…]`).
 */
export function isExpoPushToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

/** Split an array into fixed-size chunks. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Send a batch of push messages via the Expo Push API. Messages with invalid
 * tokens are dropped (and counted as `skipped`). Never throws — returns a
 * summary so callers can log delivery without try/catch.
 */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  reason?: string;
}> {
  const valid = messages.filter((m) => isExpoPushToken(m.to));
  const skipped = messages.length - valid.length;
  if (valid.length === 0) return { sent: 0, skipped, failed: 0 };

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Optional: tighten security / raise rate limits with an access token.
  if (env.expoAccessToken) headers.Authorization = `Bearer ${env.expoAccessToken}`;

  let sent = 0;
  let failed = 0;
  let reason: string | undefined;

  for (const batch of chunk(valid, PUSH_CHUNK_SIZE)) {
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers,
        // Default a sound so the §9.2 triggers alert on the device.
        body: JSON.stringify(batch.map((m) => ({ sound: 'default', ...m }))),
      });
      if (!res.ok) {
        failed += batch.length;
        reason = `Expo responded ${res.status}`;
        console.error(`[expoPush] batch failed: ${reason}`);
        continue;
      }
      sent += batch.length;
    } catch (err) {
      failed += batch.length;
      reason = err instanceof Error ? err.message : 'unknown transport error';
      console.error(`[expoPush] batch error: ${reason}`);
    }
  }

  return { sent, skipped, failed, ...(reason ? { reason } : {}) };
}

// --- Unified notification dispatch -------------------------------------------

/**
 * Per-user channel preferences (PRD §9.2 — some triggers are toggleable). The
 * User model doesn't carry these yet; the Settings screens (Phases 12–13) will
 * persist them. Until then `prefsFor` defaults every channel to enabled and
 * reads an optional `notificationPrefs` field if a future migration adds one.
 */
export interface NotificationPrefs {
  push: boolean;
  email: boolean;
}

function prefsFor(user: UserDoc): NotificationPrefs {
  const raw = (user as UserDoc & { notificationPrefs?: Partial<NotificationPrefs> })
    .notificationPrefs;
  return { push: raw?.push !== false, email: raw?.email !== false };
}

export interface NotifyOptions {
  /** Recipient User doc, or its id (loaded if a string is given). */
  recipient: UserDoc | string;
  type: NotificationType;
  /** In-app + default push body text. */
  message: string;
  /** In-app navigation target a tap routes to (PRD §8.2), e.g. `/campaign/abc`. */
  deepLinkPath: string;
  /**
   * Push channel. `false` disables push for triggers the §9.2 table marks
   * push-less (account_created, password_reset). Pass an object to override the
   * title/body. Defaults to sending with title=app name, body=`message`.
   */
  push?: boolean | { title?: string; body?: string };
  /** Rendered email to also send. Omit/null for triggers with no email. */
  email?: EmailContent | null;
  /**
   * Whether this trigger respects the user's opt-out preferences. The in-app
   * Notification is always written regardless; this only gates push/email. The
   * mandatory transactional emails (account_created, password_reset) pass
   * `respectPrefs: false`. Defaults to `true`.
   */
  respectPrefs?: boolean;
}

export interface NotifyResult {
  notification: NotificationDoc;
  push: PushResult;
  email: SendEmailResult;
}

const PUSH_DISABLED: PushResult = { sent: false, reason: 'disabled for this trigger' };
const EMAIL_DISABLED: SendEmailResult = { sent: false, reason: 'no email for this trigger' };

/**
 * Create the in-app Notification, then fan out to push + email per the trigger's
 * channel config. Best-effort on the side channels: this resolves with a result
 * summary and only rejects if the Notification write itself fails.
 */
export async function notify(opts: NotifyOptions): Promise<NotifyResult> {
  const user =
    typeof opts.recipient === 'string' ? await User.findById(opts.recipient) : opts.recipient;

  if (!user) {
    throw new Error(`notify: recipient user not found (${String(opts.recipient)})`);
  }

  // 1. In-app notification — always written (the source of truth, PRD §9.3).
  const notification = await Notification.create({
    userId: user._id,
    type: opts.type,
    message: opts.message,
    deepLinkPath: opts.deepLinkPath,
  });

  // Real-time fan-out — push the new notification to the recipient's connected
  // sockets so the web bell/feed and the mobile bell badge update live (and
  // approval celebrations fire), with no refresh. No-op when realtime is off or
  // they're offline; the in-app doc is already persisted, so a missed delivery
  // still surfaces on next fetch.
  emitToUser(String(user._id), 'notification:new', {
    notification: toPublicNotification(notification),
  });

  const respectPrefs = opts.respectPrefs ?? true;
  const prefs = prefsFor(user);

  // 2. Push — only if requested, the user opted in, and they have a valid token.
  let push: PushResult = PUSH_DISABLED;
  const wantsPush = opts.push !== false;
  if (wantsPush && (!respectPrefs || prefs.push)) {
    if (isExpoPushToken(user.pushToken)) {
      const override = typeof opts.push === 'object' ? opts.push : {};
      const result = await sendExpoPush([
        {
          to: user.pushToken,
          title: override.title ?? APP_NAME,
          body: override.body ?? opts.message,
          data: {
            deepLinkPath: opts.deepLinkPath,
            type: opts.type,
            notificationId: notification.id,
          },
        },
      ]);
      push =
        result.sent > 0 ? { sent: true } : { sent: false, reason: result.reason ?? 'not sent' };
    } else {
      push = { sent: false, reason: 'recipient has no valid push token' };
    }
  }

  // 3. Email — only if a rendered email was supplied and the user opted in.
  let email: SendEmailResult = EMAIL_DISABLED;
  if (opts.email && (!respectPrefs || prefs.email)) {
    email = await sendEmail({ to: user.email, ...opts.email });
  }

  return { notification, push, email };
}
