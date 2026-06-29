/**
 * Dependency-free grid clustering for map pins (Phase 11). Buckets points by
 * their Web-Mercator world-pixel position at the current zoom, so markers that
 * would visually overlap collapse into one cluster bubble — and split apart as the
 * user zooms in. Pure + framework-free so it's unit-testable (Phase 14) and shared
 * by the explore map.
 */

export interface MapPoint<T> {
  id: string;
  lat: number;
  lng: number;
  item: T;
}

export interface Cluster<T> {
  /** Weighted center of the clustered points (where the bubble is drawn). */
  lat: number;
  lng: number;
  points: MapPoint<T>[];
}

const TILE_SIZE = 256;

/** Project a lat/lng to world pixels at the given zoom (Web Mercator). */
function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinY = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinY) / (1 - sinY)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Cluster points into buckets ~`gridPx` apart on screen at `zoom`. Returns single
 * points as 1-element clusters; the caller draws a pin for those and a count
 * bubble for the rest.
 */
export function clusterPoints<T>(
  points: MapPoint<T>[],
  zoom: number,
  gridPx = 68,
): Cluster<T>[] {
  if (points.length === 0) return [];
  const z = Math.max(0, Math.min(22, Math.round(zoom)));
  const buckets = new Map<string, MapPoint<T>[]>();

  for (const p of points) {
    const { x, y } = project(p.lat, p.lng, z);
    const key = `${Math.floor(x / gridPx)}:${Math.floor(y / gridPx)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
    else buckets.set(key, [p]);
  }

  return Array.from(buckets.values()).map((group) => {
    const lat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const lng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    return { lat, lng, points: group };
  });
}
