/**
 * Google Geocoding integration (On-Site Location feature, PRD §17 style). The
 * Geocoding API key is **server-side only** — the mobile app calls our
 * `/api/geocoding/*` routes, which call this, so the key never ships in the app
 * binary (unlike the Maps SDK keys, which necessarily live in the build).
 *
 * Both directions are supported:
 *   - forward: typed address → `{ lat, lng }` (drop the form pin)
 *   - reverse: dragged pin → formatted address (fill the address box)
 *
 * Graceful degradation: when `GOOGLE_GEOCODING_API_KEY` is unset (the "coming
 * soon" state) every call returns `null` and `isGeocodingConfigured()` is
 * `false`, so callers fall back to the manually-dragged pin / city autocomplete.
 */
import { env } from '../lib/env';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const REQUEST_TIMEOUT_MS = 7000;

/** True once the server-side Geocoding key is configured. */
export function isGeocodingConfigured(): boolean {
  return Boolean(env.googleGeocodingApiKey);
}

/** A single geocode hit. `formatted` is Google's human-readable address. */
export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
  placeId?: string;
}

/** Shape of the Geocoding API response fields we read. */
interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
}

/** Forward geocode: an address string → its best-match coordinates. */
export async function forwardGeocode(address: string): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!isGeocodingConfigured() || !query) return null;
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${env.googleGeocodingApiKey}`;
  return requestGeocode(url);
}

/** Reverse geocode: coordinates → the best-match formatted address. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!isGeocodingConfigured()) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `${GEOCODE_URL}?latlng=${lat},${lng}&key=${env.googleGeocodingApiKey}`;
  return requestGeocode(url);
}

/** Shared fetch + parse, with a timeout. Returns `null` on any non-OK result. */
async function requestGeocode(url: string): Promise<GeocodeResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as GoogleGeocodeResponse;
    if (data.status !== 'OK') return null;
    const top = data.results?.[0];
    const loc = top?.geometry?.location;
    if (!top || !loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      formatted: top.formatted_address ?? '',
      placeId: top.place_id,
    };
  } catch {
    // Network error / abort / bad JSON — treat as "no result" so the caller can
    // fall back to the manual pin. Never let a geocode failure break a save.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
