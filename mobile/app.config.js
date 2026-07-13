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
 * Embed the Google Maps SDK keys into the native build. The keys aren't secret
 * (locked by app signature in Google Cloud), so shipping them in the bundle is
 * expected. A Google API key can hold only ONE application restriction (Android
 * apps OR iOS apps), so each platform needs its own restricted key. Until a key
 * is set, no key is embedded and the app shows a "Map coming soon" placeholder
 * (JS gate: `MAPS_ENABLED`).
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=AIza...   # Android-restricted key
 *   EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=AIza...        # iOS-restricted key
 *
 * A single legacy `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is still honored as a
 * fallback for either platform that has no platform-specific key set.
 */
function withMaps(config) {
  const fallback = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const androidKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || fallback;
  const iosKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || fallback;
  if (!androidKey && !iosKey) return config;

  const next = { ...config };
  if (iosKey) {
    next.ios = {
      ...config.ios,
      config: { ...(config.ios && config.ios.config), googleMapsApiKey: iosKey },
    };
  }
  if (androidKey) {
    next.android = {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: androidKey },
      },
    };
  }
  return next;
}

// Note: the reversed iOS OAuth client-id URL scheme is now registered by the
// `@react-native-google-signin/google-signin` config plugin (see app.json →
// `iosUrlScheme`), so no manual CFBundleURLTypes injection is needed here.

module.exports = ({ config }) => withMaps(config);
