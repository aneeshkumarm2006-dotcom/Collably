/**
 * Dynamic Expo config.
 *
 * Expo reads `app.json` first and passes its normalized `expo` block to this
 * function as `config`; whatever we return is the final config. We use it to
 * inject a couple of values from the environment that must NOT live in source
 * control, applied as small composable transforms over the base config:
 *
 *   1. Google Maps SDK key (On-Site Location feature) — see `withMaps`.
 *   2. Google Sign-In native iOS URL scheme (PRD §7.1) — see `withGoogleIosScheme`.
 *
 * Both self-degrade: when the relevant `EXPO_PUBLIC_*` var is unset, the config
 * is returned untouched so a fresh checkout still builds and runs. The JS side
 * gates on the SAME vars (`lib/env`), so the native embed and the JS gate can
 * never disagree (Metro only inlines `EXPO_PUBLIC_*` into the bundle).
 */

/**
 * Embed the Google Maps SDK key into the native build. The key isn't secret
 * (locked by app signature in Google Cloud), so shipping it in the bundle is
 * expected. Until `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set, no key is embedded
 * and the app shows a "Map coming soon" placeholder (JS gate: `MAPS_ENABLED`).
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # one key for both platforms
 */
function withMaps(config) {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (!mapsKey) return config;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios && config.ios.config),
        googleMapsApiKey: mapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: mapsKey },
      },
    },
  };
}

/**
 * Register the reversed iOS OAuth client ID as a custom URL scheme so the native
 * Google consent screen can redirect back into the app. `expo-auth-session`'s
 * Google provider uses this reversed-client-id scheme as the iOS redirect URI;
 * without it the consent flow opens but never returns and sign-in hangs.
 *
 * iOS client IDs look like `<num>-<hash>.apps.googleusercontent.com`; the scheme
 * is the same value reversed: `com.googleusercontent.apps.<num>-<hash>`.
 *
 * Android needs no scheme here — `expo-auth-session` redirects via the app's own
 * `collably://` scheme (already in app.json) and Google matches the Android
 * client by package name + signing SHA-1 configured in Google Cloud.
 *
 * Self-degrading: when `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is unset the scheme is
 * not added and the "Continue with Google" button self-hides (JS gate:
 * `GOOGLE_OAUTH_CONFIGURED`).
 */
function withGoogleIosScheme(config) {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId.endsWith(suffix)) return config;

  const reversed = `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`;
  const existing =
    (config.ios && config.ios.infoPlist && config.ios.infoPlist.CFBundleURLTypes) || [];

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios && config.ios.infoPlist),
        CFBundleURLTypes: [...existing, { CFBundleURLSchemes: [reversed] }],
      },
    },
  };
}

module.exports = ({ config }) => withGoogleIosScheme(withMaps(config));
