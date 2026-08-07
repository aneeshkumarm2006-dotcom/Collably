/**
 * Android notification channel, shared by the app (which creates it) and the
 * backend (which addresses pushes to it).
 *
 * These MUST agree. If the backend sends a `channelId` the app never created,
 * Android quietly drops the notification onto its own fallback channel and the
 * heads-up behaviour silently reverts — which is very hard to spot, because the
 * notification still arrives, it just stops peeking. Hence one constant, imported
 * by both sides, rather than a string typed out twice.
 */

/**
 * Channel id. Versioned ON PURPOSE.
 *
 * Android notification channels are IMMUTABLE once created: after the first launch
 * has registered a channel, changing its importance in code does nothing on that
 * device, ever. Android locks it so an app can't escalate its own priority behind
 * the user's back — only the user can, in system settings.
 *
 * The original `default` channel was created at DEFAULT importance, which posts to
 * the shade with no heads-up banner. Raising the importance on that id would have
 * been a no-op for every existing install, so this ships a NEW id instead. Anyone
 * upgrading gets a genuinely new channel at MAX.
 *
 * If the importance ever needs to change again, bump this id again — do not edit
 * the channel in place and expect it to take.
 */
export const ANDROID_CHANNEL_ID = 'alerts-v2';

/** Human-readable name shown in Android's per-channel notification settings. */
export const ANDROID_CHANNEL_NAME = 'Alerts';

/** Description shown under the channel name in system settings. */
export const ANDROID_CHANNEL_DESCRIPTION =
  'Messages, collab updates and account activity.';
