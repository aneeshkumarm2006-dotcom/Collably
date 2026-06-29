/**
 * Celebration helpers — decide when the confetti "Hurray" popup fires, and make
 * it survive the app being closed.
 *
 * The backend emits a live `notification:new` socket event on approval, but
 * Socket.io does **not** queue events for a disconnected client. So if the app
 * wasn't connected at approval time (and no push was tapped — e.g. on a
 * simulator), the live celebration would simply be lost. To close that gap we:
 *
 *   1. remember the id of the last notification we celebrated (SecureStore), and
 *   2. on every app open, replay the popup for the newest un-celebrated
 *      verification still sitting unread in the feed.
 *
 * The id guard also dedupes the three trigger paths (socket, push-tap, replay)
 * so a single approval can never pop twice — the leak it would otherwise have.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import { useCelebrationStore } from '@/store/celebrationStore';

/** Notification types that fire the confetti "Hurray" popup. */
export const CELEBRATION_TYPES = new Set(['creator_verified', 'business_verified']);

const LAST_KEY = 'collably.lastCelebratedNotificationId';
const TITLE = "You're verified! 🎉";
const FALLBACK = 'Your account has been approved — welcome aboard!';

// Synchronous in-session guard so two near-simultaneous triggers (e.g. the
// socket event and the on-open replay racing) can't both pass the async check.
const celebratedThisSession = new Set<string>();

async function getLastCelebratedId(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(LAST_KEY);
  } catch {
    return null;
  }
}

async function setLastCelebratedId(id: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(LAST_KEY, id);
  } catch {
    // Best-effort — a failed write just means we might replay once more.
  }
}

/**
 * Fire the confetti popup for a verification notification, at most once per
 * notification id across socket / push-tap / replay. A payload with no id (rare —
 * socket + replay always carry one) celebrates without persisting.
 */
export async function celebrateForNotification(
  id: string | undefined,
  message?: string,
): Promise<void> {
  if (!id) {
    useCelebrationStore.getState().celebrate({ title: TITLE, message: message ?? FALLBACK });
    return;
  }
  if (celebratedThisSession.has(id)) return;
  celebratedThisSession.add(id);
  if ((await getLastCelebratedId()) === id) return;
  await setLastCelebratedId(id);
  useCelebrationStore.getState().celebrate({ title: TITLE, message: message ?? FALLBACK });
}

type NotificationItem = { _id: string; type: string; message: string };

/**
 * On app open, replay the popup for the newest un-celebrated verification still
 * unread in the feed — covering an approval that landed while the app was closed
 * (or a device/simulator with no push). Best-effort and id-deduped.
 */
export async function replayMissedCelebration(): Promise<void> {
  try {
    const { data } = await api.get<{ data: NotificationItem[] }>('/notifications', {
      params: { unread: true },
    });
    // The feed is newest-first, so the first match is the latest verification.
    const latest = data.data?.find((n) => CELEBRATION_TYPES.has(n.type));
    if (latest) await celebrateForNotification(latest._id, latest.message);
  } catch {
    // Non-fatal — the live socket / push paths still cover the common case.
  }
}
