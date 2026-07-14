/**
 * Distance helpers for the "collabs near you" surfaces.
 *
 * IMPORTANT — these distances are **approximate by design**. A creator who hasn't
 * been accepted onto a campaign never receives its exact pin: the API sends a
 * fuzzed `approxCoordinates` + `radiusMeters` instead (see `CampaignLocation`).
 * So a distance computed here is a distance to the *fuzzed* point, and the UI must
 * present it as such ("~2.3 km") rather than implying a precise location.
 */
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Campaign, GeoPoint } from '@/types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The best point we're allowed to know for a campaign: the exact pin when the
 * viewer is authorized, otherwise the server's fuzzed point. `undefined` for a
 * remote or un-pinned campaign.
 */
export function campaignPoint(c: Campaign): GeoPoint | undefined {
  return c.location?.coordinates ?? c.location?.approxCoordinates;
}

/**
 * Distance from `origin` to a campaign, in km — or `undefined` when we don't know
 * where the user is, or the campaign has no pin at all.
 */
export function campaignDistanceKm(c: Campaign, origin: GeoPoint | null): number | undefined {
  if (!origin) return undefined;
  const point = campaignPoint(c);
  if (!point) return undefined;
  return distanceKm(origin, point);
}

/**
 * Format a distance for display. Always prefixed with "~" unless the pin is exact,
 * because the underlying point is fuzzed — claiming "2.3 km" from a fuzzed point
 * would be false precision.
 */
export function formatDistance(km: number, exact = false): string {
  const tilde = exact ? '' : '~';
  if (km < 1) return `${tilde}${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${tilde}${km.toFixed(1)} km`;
  return `${tilde}${Math.round(km)} km`;
}

export type UserLocation = {
  /** The device's coarse position, or null while unknown / denied. */
  point: GeoPoint | null;
  /** True once we've settled the permission question either way. */
  resolved: boolean;
  /** True when the user denied (or the OS blocked) location access. */
  denied: boolean;
};

/**
 * Ask for foreground location once and return the device's position.
 *
 * Deliberately low-stakes: we request *balanced* accuracy (city-block level), which
 * is all an approximate distance needs, and a denial is not an error — the caller
 * simply falls back to showing the city instead of a distance.
 */
export function useUserLocation(enabled = true): UserLocation {
  const [state, setState] = useState<UserLocation>({ point: null, resolved: false, denied: false });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState({ point: null, resolved: true, denied: true });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setState({
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          resolved: true,
          denied: false,
        });
      } catch {
        // Location services off, timed out, or unavailable (e.g. a simulator with
        // no fix). Treat exactly like a denial: the UI degrades to city names.
        if (!cancelled) setState({ point: null, resolved: true, denied: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
