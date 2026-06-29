/**
 * Geocoding endpoints (On-Site Location feature): a thin proxy for turning a
 * typed address into a pin and back. Every response carries `configured` so the
 * UI degrades gracefully when the key is unset. Maps 1:1 to
 * `backend/src/routes/geocoding.ts`.
 */
import type { HttpClient } from '../types';
import type { GeocodingResultResponse, GeocodingStatusResponse } from '../types';

export function createGeocodingApi(http: HttpClient) {
  return {
    /** GET /geocoding/status: whether typed-address geocoding is available. */
    status: (signal?: AbortSignal) =>
      http.get<GeocodingStatusResponse>('/geocoding/status', { signal }),

    /** GET /geocoding/search: forward geocode an address → best-match pin. */
    search: (q: string, signal?: AbortSignal) =>
      http.get<GeocodingResultResponse>('/geocoding/search', { query: { q }, signal }),

    /** GET /geocoding/reverse: reverse geocode a dragged pin → formatted address. */
    reverse: (lat: number, lng: number, signal?: AbortSignal) =>
      http.get<GeocodingResultResponse>('/geocoding/reverse', { query: { lat, lng }, signal }),
  };
}

export type GeocodingApi = ReturnType<typeof createGeocodingApi>;
