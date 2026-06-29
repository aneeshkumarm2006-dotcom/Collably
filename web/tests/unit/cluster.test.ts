import { describe, expect, it } from 'vitest';
import { clusterPoints, type MapPoint } from '@/lib/maps/cluster';

/** Tiny helper: a labelled point whose `item` is just its id (so we can assert identity). */
function pt(id: string, lat: number, lng: number): MapPoint<string> {
  return { id, lat, lng, item: id };
}

describe('clusterPoints', () => {
  it('returns an empty array for no points', () => {
    expect(clusterPoints([], 5)).toEqual([]);
    expect(clusterPoints<string>([], 0, 100)).toEqual([]);
  });

  it('keeps two far-apart points as two separate single-point clusters', () => {
    const ny = pt('ny', 40.0, -74.0);
    const syd = pt('syd', -33.8, 151.2);
    const clusters = clusterPoints([ny, syd], 5);
    expect(clusters).toHaveLength(2);
    // Each cluster carries exactly one of the originals.
    expect(clusters.every((c) => c.points.length === 1)).toBe(true);
    const ids = clusters.flatMap((c) => c.points.map((p) => p.id)).sort();
    expect(ids).toEqual(['ny', 'syd']);
  });

  it('collapses two nearby points at low zoom, then splits them as zoom increases', () => {
    // These two coordinates share a grid cell at z<=8 and separate at z>=9
    // (verified against the Web-Mercator projection used by the module).
    const a = pt('a', 40.0, -74.0);
    const b = pt('b', 40.0, -74.2);

    const low = clusterPoints([a, b], 3);
    expect(low).toHaveLength(1);
    expect(low[0].points).toHaveLength(2);

    const high = clusterPoints([a, b], 12);
    expect(high).toHaveLength(2);
    expect(high.every((c) => c.points.length === 1)).toBe(true);
  });

  it('carries the original point inside a single-point cluster', () => {
    const only = pt('solo', 12.34, 56.78);
    const result = clusterPoints([only], 8);
    expect(result).toHaveLength(1);
    const [cluster] = result;
    expect(cluster.points).toEqual([only]);
    expect(cluster.points[0].item).toBe('solo');
    // A lone point's weighted center is the point itself.
    expect(cluster.lat).toBe(12.34);
    expect(cluster.lng).toBe(56.78);
  });

  it('draws the cluster center at the mean lat/lng of its grouped points', () => {
    const a = pt('a', 40.0, -74.0);
    const b = pt('b', 40.4, -74.2);
    const [cluster] = clusterPoints([a, b], 1);
    expect(cluster.points).toHaveLength(2);
    expect(cluster.lat).toBeCloseTo(40.2, 10); // (40.0 + 40.4) / 2
    expect(cluster.lng).toBeCloseTo(-74.1, 10); // (-74.0 + -74.2) / 2
  });

  it('rounds the zoom to the nearest integer (affecting which cells collapse)', () => {
    const a = pt('a', 40.0, -74.0);
    const b = pt('b', 40.0, -74.2);
    // Boundary lives between z=8 (collapsed) and z=9 (split).
    expect(clusterPoints([a, b], 8.4)).toHaveLength(1); // rounds down to 8
    expect(clusterPoints([a, b], 8.6)).toHaveLength(2); // rounds up to 9
  });

  it('clamps the zoom into the 0..22 range', () => {
    const a = pt('a', 40.0, -74.0);
    const b = pt('b', 40.0, -74.2);
    // Below-range zooms behave exactly like zoom 0 (fully collapsed).
    expect(clusterPoints([a, b], -100)).toEqual(clusterPoints([a, b], 0));
    expect(clusterPoints([a, b], -100)).toHaveLength(1);
    // Above-range zooms behave exactly like zoom 22 (fully split).
    expect(clusterPoints([a, b], 999)).toEqual(clusterPoints([a, b], 22));
    expect(clusterPoints([a, b], 999)).toHaveLength(2);
  });

  it('honours a custom grid size when bucketing', () => {
    const a = pt('a', 40.0, -74.0);
    const b = pt('b', 40.0, -74.2);
    // With the default grid they split at z=9; an enormous grid forces them back together.
    expect(clusterPoints([a, b], 9)).toHaveLength(2);
    expect(clusterPoints([a, b], 9, 100_000)).toHaveLength(1);
  });
});
