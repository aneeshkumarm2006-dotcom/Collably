/**
 * Dynamic Expo config (On-Site Location feature).
 *
 * Expo reads `app.json` first and passes its normalized `expo` block to this
 * function as `config`; whatever we return is the final config. We use it for
 * ONE thing: injecting the Google Maps SDK key from the environment so the key
 * never lives in source control.
 *
 * Until `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set, no key is embedded — the map
 * tiles won't render, so the app shows a "Map coming soon" placeholder. Crucially,
 * the JS side gates on the SAME env var via `lib/env` → `MAPS_ENABLED`; we read
 * exactly one var here so the native embed and the JS gate can never disagree.
 * (Metro only inlines `EXPO_PUBLIC_*` vars into the JS bundle, so a non-public var
 * would embed natively yet leave the JS gate off — hence one public var only.)
 * The Maps SDK key isn't secret anyway (locked by app signature in Google Cloud),
 * so shipping it in the bundle is expected. Set it in `.env` (dev) or EAS env
 * (builds), run a new dev build, and the map turns on with no code changes.
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # one key for both platforms
 *
 * (You can use platform-restricted keys instead — split into ANDROID/IOS vars
 * and wire them below — but a single app-signature-locked key is fine for v1.)
 */
module.exports = ({ config }) => {
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
};
