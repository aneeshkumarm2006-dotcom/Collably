/**
 * Client wrapper for the backend's `/api/geocoding/*` routes (On-Site Location
 * feature). The Google Geocoding key lives only on the server, so the campaign
 * form goes through these helpers rather than calling Google directly.
 *
 * Every call is best-effort and degrades gracefully: if geocoding isn't
 * configured server-side (the "coming soon" state) or the request fails, the
 * helpers return `null` / `configured: false` and the caller falls back to the
 * manually-dragged pin.
 */
import { api } from './api';

export interface GeocodeHit {
  lat: number;
  lng: number;
  formatted: string;
  placeId?: string;
}

/** Whether typed-address geocoding is available server-side. */
export async function geocodingConfigured(): Promise<boolean> {
  try {
    const { data } = await api.get<{ configured: boolean }>('/geocoding/status');
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

/** Forward geocode a typed address → best-match pin (or `null`). */
export async function forwardGeocode(query: string): Promise<GeocodeHit | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const { data } = await api.get<{ configured: boolean; result: GeocodeHit | null }>(
      '/geocoding/search',
      { params: { q } },
    );
    return data.result ?? null;
  } catch {
    return null;
  }
}

/** Reverse geocode a dragged pin → formatted address (or `null`). */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeHit | null> {
  try {
    const { data } = await api.get<{ configured: boolean; result: GeocodeHit | null }>(
      '/geocoding/reverse',
      { params: { lat, lng } },
    );
    return data.result ?? null;
  } catch {
    return null;
  }
}
