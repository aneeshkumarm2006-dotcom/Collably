import { describe, expect, it } from 'vitest';
import type { PublicCampaign } from '@/lib/api/types';
import { campaignMapPoints } from '@/lib/maps/campaign-points';

/**
 * Build a minimal-but-complete PublicCampaign, overriding only the fields a
 * given test cares about. Types are stripped at runtime (esbuild), so loose
 * literals for the enum-ish fields are fine for exercising the mapper.
 */
function campaign(overrides: Partial<PublicCampaign> = {}): PublicCampaign {
  return {
    _id: 'c1',
    businessId: 'b1',
    title: 'Test Campaign',
    description: 'A campaign.',
    category: 'Beauty',
    isRemote: false,
    reward: { type: 'Product', description: 'Free product', estimatedValue: 0 },
    deliverables: [],
    deadline: '2026-07-01T00:00:00.000Z',
    minFollowers: 0,
    status: 'active',
    tags: [],
    applicationsCount: 0,
    isFeatured: false,
    isSpam: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  } as PublicCampaign;
}

describe('campaignMapPoints', () => {
  it('returns an empty array for an empty list', () => {
    expect(campaignMapPoints([])).toEqual([]);
  });

  it('skips remote campaigns even when they carry coordinates', () => {
    const remote = campaign({
      isRemote: true,
      location: { coordinates: { lat: 10, lng: 20 } },
    });
    expect(campaignMapPoints([remote])).toEqual([]);
  });

  it('skips campaigns with no location and ones whose location has no coordinate', () => {
    const noLocation = campaign({ _id: 'a', location: undefined });
    const cityOnly = campaign({ _id: 'b', location: { city: 'Toronto' } });
    expect(campaignMapPoints([noLocation, cityOnly])).toEqual([]);
  });

  it('skips a location whose coordinate is non-numeric', () => {
    const bad = campaign({
      location: { coordinates: { lat: 'oops' as unknown as number, lng: 5 } },
    });
    expect(campaignMapPoints([bad])).toEqual([]);
  });

  it('uses the precise location.coordinates when present (preferring it over approx)', () => {
    const c = campaign({
      _id: 'precise',
      location: {
        coordinates: { lat: 43.6, lng: -79.4 },
        approxCoordinates: { lat: 1, lng: 2 },
      },
    });
    const points = campaignMapPoints([c]);
    expect(points).toHaveLength(1);
    const [p] = points;
    expect(p.lat).toBe(43.6);
    expect(p.lng).toBe(-79.4);
    expect(p.id).toBe('precise');
    expect(p.item.id).toBe('precise');
  });

  it('falls back to approxCoordinates when precise coordinates are absent', () => {
    const c = campaign({
      location: { approxCoordinates: { lat: 1.5, lng: 2.5 } },
    });
    const [p] = campaignMapPoints([c]);
    expect(p.lat).toBe(1.5);
    expect(p.lng).toBe(2.5);
  });

  it('labels the reward with compact currency when estimatedValue > 0', () => {
    const c = campaign({
      location: { coordinates: { lat: 1, lng: 2 } },
      reward: { type: 'Product', description: '', estimatedValue: 180 },
    });
    expect(campaignMapPoints([c])[0].item.rewardLabel).toBe('$180');
  });

  it("uses the reward type's first word when estimatedValue is 0 or absent", () => {
    const zeroValue = campaign({
      location: { coordinates: { lat: 1, lng: 2 } },
      reward: { type: 'Cash+Product', description: '', estimatedValue: 0 },
    });
    expect(campaignMapPoints([zeroValue])[0].item.rewardLabel).toBe('Cash');

    const noValue = campaign({
      location: { coordinates: { lat: 1, lng: 2 } },
      reward: { type: 'Experience', description: '' },
    });
    expect(campaignMapPoints([noValue])[0].item.rewardLabel).toBe('Experience');
  });

  it("falls back to 'Reward' when there is no reward type and no value", () => {
    const c = campaign({
      location: { coordinates: { lat: 1, lng: 2 } },
      reward: { type: '' as PublicCampaign['reward']['type'], description: '', estimatedValue: 0 },
    });
    expect(campaignMapPoints([c])[0].item.rewardLabel).toBe('Reward');
  });

  it('passes the campaign title and category onto the point meta', () => {
    const c = campaign({
      title: 'Glow Up',
      category: 'Beauty',
      location: { coordinates: { lat: 1, lng: 2 } },
    });
    const [p] = campaignMapPoints([c]);
    expect(p.item.title).toBe('Glow Up');
    expect(p.item.category).toBe('Beauty');
  });

  it('maps a mixed list, keeping only the plottable local campaigns in order', () => {
    const a = campaign({ _id: 'a', location: { coordinates: { lat: 1, lng: 2 } } });
    const remote = campaign({ _id: 'r', isRemote: true });
    const cityOnly = campaign({ _id: 'n', location: { city: 'X' } });
    const b = campaign({ _id: 'b', location: { approxCoordinates: { lat: 3, lng: 4 } } });
    const points = campaignMapPoints([a, remote, cityOnly, b]);
    expect(points.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
