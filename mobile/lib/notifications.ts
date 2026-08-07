/**
 * Expo push-notification registration + backend sync (PRD §8.2, §9, §15).
 *
 *  - `registerForPushNotifications()` asks for OS permission, fetches the Expo
 *    push token, and POSTs it to `/api/push/register` so the server can target
 *    this device. Call it on app open after login (Phase 15 wires the trigger).
 *  - `unregisterPushToken()` clears the token server-side on logout.
 *  - `configureNotificationHandler()` sets the foreground presentation behavior;
 *    call once at app start.
 *
 * Everything here degrades gracefully: on a simulator, when permission is denied,
 * or when the projectId is missing, it returns `null` rather than throwing, so a
 * push hiccup never blocks login.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { api } from './api';
import {
  ANDROID_CHANNEL_ID,
  ANDROID_CHANNEL_NAME,
  ANDROID_CHANNEL_DESCRIPTION,
} from '@/constants';

// Push notifications were removed from Expo Go (Android) in SDK 53: merely
// importing `expo-notifications` there throws. Detect Expo Go so we can no-op
// instead of crashing — real dev/production builds get the full native module.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Lazily load `expo-notifications` so the module is never imported under Expo Go.
 * Returns `null` in Expo Go (and lets every caller below degrade gracefully).
 */
type NotificationsModule = typeof import('expo-notifications');
function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  return require('expo-notifications') as NotificationsModule;
}

/** How notifications behave while the app is foregrounded. */
export function configureNotificationHandler(): void {
  // No push runtime on web — setting a handler only logs a "not supported"
  // warning, so skip it (this runs at module load on every platform).
  if (Platform.OS === 'web') return;

  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Resolve the EAS projectId Expo needs to mint a push token. */
function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Request permission, get the Expo push token, and register it with the backend.
 * Returns the token on success, or `null` if unavailable (simulator, denied, etc).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // No Expo push token on web — the native token APIs throw there.
  if (Platform.OS === 'web') return null;

  // Push only works on physical devices.
  if (!Device.isDevice) return null;

  // Not available in Expo Go (SDK 53+ removed Android push) — skip silently.
  const Notifications = getNotifications();
  if (!Notifications) return null;

  // Android needs a notification channel before tokens/notifications work well.
  //
  // MAX, not DEFAULT: on Android 8+ the channel's importance is the ONLY thing that
  // decides whether a notification peeks as a heads-up banner over the current
  // screen. At DEFAULT it drops silently into the shade, which is why notifications
  // were arriving but never showing themselves.
  //
  // Note the channel id is versioned (see ANDROID_CHANNEL_ID) because channels are
  // immutable once created — this had to be a new channel, not an edit to the old.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: ANDROID_CHANNEL_NAME,
      description: ANDROID_CHANNEL_DESCRIPTION,
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      // Show the content on the lock screen; the alternative hides the text behind
      // "Contents hidden", which makes a message notification useless.
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#1877F2',
      enableVibrate: true,
      showBadge: true,
    });

    // Retire the old DEFAULT-importance channel so it stops appearing as a stale
    // second entry in the user's notification settings. Deleting is safe: nothing
    // targets it any more, and Android tolerates deleting a missing channel.
    await Notifications.deleteNotificationChannelAsync('default').catch(() => {});
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId = getProjectId();
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/push/register', { pushToken: token });
    return token;
  } catch {
    // Network or Expo service hiccup — don't block the caller.
    return null;
  }
}

/** Remove this device's push token server-side (call on logout). */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/push/token');
  } catch {
    // Best-effort: logout proceeds even if the unregister call fails.
  }
}
