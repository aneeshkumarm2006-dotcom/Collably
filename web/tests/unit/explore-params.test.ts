import { describe, expect, it } from 'vitest';
import {
  CREATOR_TIERS,
  defaultCampaignFilters,
  type CampaignFilters,
} from '@/components/shared/filter-sidebar';
import {
  exploreStateFromSearchParams,
  exploreStateKey,
  paramsFromExplore,
  type ExploreState,
} from '@/lib/explore-params';

/** Build an ExploreState, overriding only the filters / sort / q a test cares about. */
function makeState(overrides: {
  filters?: Partial<CampaignFilters>;
  sort?: ExploreState['sort'];
  q?: string;
}): ExploreState {
  return {
    filters: { ...defaultCampaignFilters, ...(overrides.filters ?? {}) },
    sort: overrides.sort ?? 'newest',
    q: overrides.q ?? '',
  };
}

describe('exploreStateFromSearchParams', () => {
  it('returns sensible defaults for an empty query', () => {
    const state = exploreStateFromSearchParams({});
    expect(state).toEqual({ filters: defaultCampaignFilters, sort: 'newest', q: '' });
  });

  it('splits CSV category/rewardType/platform params and drops blank entries', () => {
    const state = exploreStateFromSearchParams({
      category: 'Beauty, Food ,',
      rewardType: 'Product,Voucher',
      platform: 'Instagram , TikTok',
    });
    expect(state.filters.categories).toEqual(['Beauty', 'Food']);
    expect(state.filters.rewardTypes).toEqual(['Product', 'Voucher']);
    expect(state.filters.platforms).toEqual(['Instagram', 'TikTok']);
  });

  it('reads remoteOnly only when remote === "true"', () => {
    expect(exploreStateFromSearchParams({ remote: 'true' }).filters.remoteOnly).toBe(true);
    expect(exploreStateFromSearchParams({ remote: 'false' }).filters.remoteOnly).toBe(false);
    expect(exploreStateFromSearchParams({ remote: '1' }).filters.remoteOnly).toBe(false);
    expect(exploreStateFromSearchParams({}).filters.remoteOnly).toBe(false);
  });

  it('keeps a whitelisted sort and falls back to "newest" for anything else', () => {
    expect(exploreStateFromSearchParams({ sort: 'reward' }).sort).toBe('reward');
    expect(exploreStateFromSearchParams({ sort: 'relevance' }).sort).toBe('relevance');
    expect(exploreStateFromSearchParams({ sort: 'bogus' }).sort).toBe('newest');
    expect(exploreStateFromSearchParams({}).sort).toBe('newest');
  });

  it('carries location, creator tier and q through', () => {
    const state = exploreStateFromSearchParams({
      location: 'Toronto',
      tier: CREATOR_TIERS[2], // 'Micro (10K-50K)'
      q: 'glow',
    });
    expect(state.filters.location).toBe('Toronto');
    expect(state.filters.creatorTier).toBe(CREATOR_TIERS[2]);
    expect(state.q).toBe('glow');
  });

  it('defaults creatorTier to "Open to all" and location to "" when absent', () => {
    const state = exploreStateFromSearchParams({});
    expect(state.filters.creatorTier).toBe('Open to all');
    expect(state.filters.location).toBe('');
  });

  it('takes only the first value when a param arrives as an array', () => {
    const state = exploreStateFromSearchParams({
      sort: ['reward', 'newest'],
      q: ['hi', 'there'],
      category: ['A,B', 'C'],
    });
    expect(state.sort).toBe('reward');
    expect(state.q).toBe('hi');
    expect(state.filters.categories).toEqual(['A', 'B']);
  });
});

describe('paramsFromExplore', () => {
  it('emits just sort + the default limit for an empty state', () => {
    expect(paramsFromExplore(makeState({}))).toEqual({ sort: 'newest', limit: 12 });
  });

  it('honours a custom limit argument', () => {
    expect(paramsFromExplore(makeState({}), 24).limit).toBe(24);
  });

  it('trims q and omits it when blank', () => {
    expect(paramsFromExplore(makeState({ q: '  glow  ' })).q).toBe('glow');
    expect(paramsFromExplore(makeState({ q: '   ' }))).not.toHaveProperty('q');
  });

  it('passes category and rewardType arrays through verbatim', () => {
    const p = paramsFromExplore(
      makeState({ filters: { categories: ['Beauty'], rewardTypes: ['Product', 'Voucher'] } }),
    );
    expect(p.category).toEqual(['Beauty']);
    expect(p.rewardType).toEqual(['Product', 'Voucher']);
  });

  it('omits empty arrays', () => {
    const p = paramsFromExplore(makeState({ filters: { categories: [], rewardTypes: [], platforms: [] } }));
    expect(p).not.toHaveProperty('category');
    expect(p).not.toHaveProperty('rewardType');
    expect(p).not.toHaveProperty('platform');
  });

  it('sends only the first selected platform', () => {
    const p = paramsFromExplore(makeState({ filters: { platforms: ['Instagram', 'TikTok'] } }));
    expect(p.platform).toBe('Instagram');
  });

  it('maps remoteOnly to location "remote", overriding any typed city', () => {
    const p = paramsFromExplore(makeState({ filters: { remoteOnly: true, location: 'Toronto' } }));
    expect(p.location).toBe('remote');
  });

  it('uses a trimmed city as the location when not remote, omitting a blank one', () => {
    expect(paramsFromExplore(makeState({ filters: { location: '  Toronto ' } })).location).toBe('Toronto');
    expect(paramsFromExplore(makeState({ filters: { location: '   ' } }))).not.toHaveProperty('location');
  });

  it('maps each creator tier to its follower bucket', () => {
    expect(paramsFromExplore(makeState({ filters: { creatorTier: CREATOR_TIERS[1] } })).followersBucket).toBe('nano');
    expect(paramsFromExplore(makeState({ filters: { creatorTier: CREATOR_TIERS[2] } })).followersBucket).toBe('micro');
    expect(paramsFromExplore(makeState({ filters: { creatorTier: CREATOR_TIERS[3] } })).followersBucket).toBe('mid');
  });

  it('omits followersBucket for "Open to all" and for an unknown tier', () => {
    expect(paramsFromExplore(makeState({ filters: { creatorTier: 'Open to all' } }))).not.toHaveProperty('followersBucket');
    expect(paramsFromExplore(makeState({ filters: { creatorTier: 'Totally unknown tier' } }))).not.toHaveProperty('followersBucket');
  });
});

describe('exploreStateKey', () => {
  it('is the stable JSON of the derived backend params', () => {
    const state = makeState({ q: 'glow', sort: 'reward' });
    expect(exploreStateKey(state)).toBe(JSON.stringify(paramsFromExplore(state)));
  });

  it('is identical for two equal states and differs for different ones', () => {
    const a = makeState({ filters: { categories: ['Beauty'] } });
    const b = makeState({ filters: { categories: ['Beauty'] } });
    const c = makeState({ filters: { categories: ['Food'] } });
    expect(exploreStateKey(a)).toBe(exploreStateKey(b));
    expect(exploreStateKey(a)).not.toBe(exploreStateKey(c));
  });
});
