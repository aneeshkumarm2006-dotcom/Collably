/**
 * Google Maps JS loader (Phase 11). Injects the Maps JS `<script>` once and
 * resolves when `google.maps` is ready. Mirrors the rest of the build's
 * "graceful when unconfigured" pattern (geocoding `configured`, Cloudinary): when
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset the loader rejects with
 * `MapsUnconfiguredError`, and callers fall back to a textual location card / the
 * city-only flow rather than erroring.
 *
 * The API key is a NEXT_PUBLIC_ value by necessity — the Maps SDK runs in the
 * browser, so the key necessarily ships in the build (Google's recommended
 * protection is HTTP-referrer restrictions on the key, configured in Phase 15).
 */

/** Thrown by `loadGoogleMaps()` when no Maps API key is configured. */
export class MapsUnconfiguredError extends Error {
  constructor() {
    super('Google Maps is not configured.');
    this.name = 'MapsUnconfiguredError';
  }
}

/** The browser Maps key (referrer-restricted in prod). Empty string ⇒ unconfigured. */
export function getMapsApiKey(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
}

/** True once a Maps JS key is present (the "map available" gate). */
export function isMapsConfigured(): boolean {
  return getMapsApiKey().length > 0;
}

let loadPromise: Promise<typeof google.maps> | null = null;

/**
 * Load Maps JS, returning the `google.maps` namespace. Idempotent — repeated
 * calls share one `<script>` and one promise. Rejects with `MapsUnconfiguredError`
 * if no key is set (so callers can branch to the unconfigured UI without a probe).
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser.'));
  }
  if (typeof google !== 'undefined' && google.maps) return Promise.resolve(google.maps);
  if (loadPromise) return loadPromise;

  const key = getMapsApiKey();
  if (!key) return Promise.reject(new MapsUnconfiguredError());

  loadPromise = new Promise((resolve, reject) => {
    const CALLBACK = '__collablyOnMapsReady';
    window[CALLBACK] = () => {
      if (typeof google !== 'undefined' && google.maps) resolve(google.maps);
      else reject(new Error('Google Maps loaded without the maps namespace.'));
    };

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key,
      loading: 'async',
      callback: CALLBACK,
      v: 'weekly',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      // Allow a later retry (e.g. transient network failure).
      loadPromise = null;
      reject(new Error('Failed to load the Google Maps script.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
