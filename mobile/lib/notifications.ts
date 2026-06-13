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
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

/** How notifications behave while the app is foregrounded. */
export function configureNotificationHandler(): void {
  // No push runtime on web — setting a handler only logs a "not supported"
  // warning, so skip it (this runs at module load on every platform).
  if (Platform.OS === 'web') return;

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

  // Android needs a notification channel before tokens/notifications work well.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
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
