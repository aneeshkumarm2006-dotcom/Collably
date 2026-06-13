/**
 * Web no-op for {@link usePushNotifications} (Metro resolves this `.web.ts`
 * variant on web, the native `usePushNotifications.ts` everywhere else).
 *
 * `expo-notifications` has no push runtime on web: its web fallback module
 * implements only `addListener`/`removeListeners`, so the native hook's call to
 * `Notifications.useLastNotificationResponse()` → `getLastNotificationResponse()`
 * throws *"not available on web"* and crashes the whole app on load. There is no
 * Expo push token, foreground receipt, or cold-start tap to wire up in a browser,
 * so the entire hook is a no-op here — keeping web (`npm start` → "w") bootable
 * while the device builds keep full push behavior.
 */
export function usePushNotifications(_ready: boolean): void {
  // Intentionally empty: no push subsystem on web.
}
