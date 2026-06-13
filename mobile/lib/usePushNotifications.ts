/**
 * Push-notification runtime wiring (PRD §8.2, §9, §15).
 *
 * One hook, mounted once in the root layout, owns every push concern that needs
 * React state or navigation:
 *
 *   1. **Register + prime badge** — once the session is authenticated, register
 *      this device's Expo token (`POST /api/push/register`, via
 *      {@link registerForPushNotifications}) and pull the current unread count so
 *      the bell badge is correct on launch.
 *   2. **Foreground receipts** — while the app is open, a push arriving refreshes
 *      the unread count so the bell badge ticks up without a manual reload.
 *   3. **Taps** — tapping a push (foreground, background, or cold-start launch)
 *      reads the `deepLinkPath` the backend stamped into the push `data` payload
 *      (see `services/expoPush.notify`) and navigates to it, resolved for the
 *      signed-in user's role.
 *
 * `Notifications.useLastNotificationResponse()` is the single source for taps: it
 * surfaces the response that launched the app from cold **and** every subsequent
 * tap, so we don't need a separate cold-start probe. We dedupe by the
 * notification identifier and wait until the app has booted + the session is
 * authenticated before navigating, so a tap that launches the app still lands on
 * the right screen once the auth gate has mounted the correct navigator.
 *
 * Everything degrades gracefully — registration self-disables on simulators /
 * denied permissions (see `lib/notifications`), and a tap with no `deepLinkPath`
 * is simply ignored.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { registerForPushNotifications } from './notifications';
import { resolveDeepLink } from './deepLink';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Wire push registration, the unread badge, and tap-to-navigate deep linking.
 * Pass `ready` (the root layout's booted flag) so cold-start taps wait for the
 * navigator to mount before routing.
 */
export function usePushNotifications(ready: boolean): void {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  // 1. Register this device + prime the unread badge once authenticated.
  useEffect(() => {
    if (status !== 'authenticated') return;
    void registerForPushNotifications();
    void useNotificationStore.getState().refresh();
  }, [status]);

  // 2. Foreground receipts: keep the bell badge fresh as pushes arrive.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void useNotificationStore.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  // 3. Taps (foreground / background / cold-start) → navigate to deepLinkPath.
  useEffect(() => {
    if (!ready || status !== 'authenticated' || !lastResponse) return;

    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;

    const data = lastResponse.notification.request.content.data as { deepLinkPath?: unknown };
    const path = typeof data?.deepLinkPath === 'string' ? data.deepLinkPath : null;
    if (!path) return;

    // Mark handled before navigating so a re-render can't double-route.
    handledId.current = id;
    void useNotificationStore.getState().refresh();
    router.push(resolveDeepLink(path, role));
  }, [ready, status, role, lastResponse, router]);
}
