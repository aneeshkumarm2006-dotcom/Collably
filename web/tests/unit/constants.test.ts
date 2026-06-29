import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUS_TABS,
  APPLICATION_STATUSES,
  CAMPAIGN_SORT_LABELS,
  CAMPAIGN_SORTS,
  CAMPAIGN_STATUS_TABS,
  CAMPAIGN_STATUS_TRANSITIONS,
  CAMPAIGN_STATUSES,
  canTransitionCampaign,
  CREATOR_TIER_BUCKETS,
  FOLLOWER_BUCKET_LABELS,
  FOLLOWER_BUCKETS,
  UPLOAD_FOLDERS,
} from '@/lib/constants';

describe('canTransitionCampaign — valid transitions', () => {
  it('allows Draft → Active', () => {
    expect(canTransitionCampaign('Draft', 'Active')).toBe(true);
  });

  it('allows Active → Paused / Closed / Completed', () => {
    expect(canTransitionCampaign('Active', 'Paused')).toBe(true);
    expect(canTransitionCampaign('Active', 'Closed')).toBe(true);
    expect(canTransitionCampaign('Active', 'Completed')).toBe(true);
  });

  it('allows Paused → Active / Closed / Completed', () => {
    expect(canTransitionCampaign('Paused', 'Active')).toBe(true);
    expect(canTransitionCampaign('Paused', 'Closed')).toBe(true);
    expect(canTransitionCampaign('Paused', 'Completed')).toBe(true);
  });

  it('allows Closed → Completed', () => {
    expect(canTransitionCampaign('Closed', 'Completed')).toBe(true);
  });
});

describe('canTransitionCampaign — invalid transitions', () => {
  it('rejects Draft → anything but Active', () => {
    expect(canTransitionCampaign('Draft', 'Paused')).toBe(false);
    expect(canTransitionCampaign('Draft', 'Closed')).toBe(false);
    expect(canTransitionCampaign('Draft', 'Completed')).toBe(false);
  });

  it('rejects skipping back to Draft from any later state', () => {
    expect(canTransitionCampaign('Active', 'Draft')).toBe(false);
    expect(canTransitionCampaign('Paused', 'Draft')).toBe(false);
    expect(canTransitionCampaign('Closed', 'Draft')).toBe(false);
  });

  it('rejects Closed → Active / Paused', () => {
    expect(canTransitionCampaign('Closed', 'Active')).toBe(false);
    expect(canTransitionCampaign('Closed', 'Paused')).toBe(false);
  });

  it('treats Completed as terminal (no outgoing transitions)', () => {
    for (const to of CAMPAIGN_STATUSES) {
      expect(canTransitionCampaign('Completed', to)).toBe(false);
    }
  });

  it('rejects a no-op transition to the same status', () => {
    expect(canTransitionCampaign('Active', 'Active')).toBe(false);
    expect(canTransitionCampaign('Draft', 'Draft')).toBe(false);
  });

  it('is consistent with CAMPAIGN_STATUS_TRANSITIONS for every from/to pair', () => {
    for (const from of CAMPAIGN_STATUSES) {
      for (const to of CAMPAIGN_STATUSES) {
        expect(canTransitionCampaign(from, to)).toBe(
          CAMPAIGN_STATUS_TRANSITIONS[from].includes(to),
        );
      }
    }
  });
});

describe('CAMPAIGN_STATUS_TABS', () => {
  it('starts with "All" then lists the campaign statuses in order', () => {
    expect(CAMPAIGN_STATUS_TABS[0]).toBe('All');
    expect(CAMPAIGN_STATUS_TABS.slice(1)).toEqual([...CAMPAIGN_STATUSES]);
  });

  it('has exactly one more entry than CAMPAIGN_STATUSES', () => {
    expect(CAMPAIGN_STATUS_TABS).toHaveLength(CAMPAIGN_STATUSES.length + 1);
  });
});

describe('APPLICATION_STATUS_TABS', () => {
  it('starts with "All" then lists the application statuses in order', () => {
    expect(APPLICATION_STATUS_TABS[0]).toBe('All');
    expect(APPLICATION_STATUS_TABS.slice(1)).toEqual([...APPLICATION_STATUSES]);
  });

  it('has exactly one more entry than APPLICATION_STATUSES', () => {
    expect(APPLICATION_STATUS_TABS).toHaveLength(APPLICATION_STATUSES.length + 1);
  });
});

describe('FOLLOWER_BUCKETS', () => {
  it('contains the raw ranges plus the named creator tiers', () => {
    expect([...FOLLOWER_BUCKETS]).toEqual([
      'under1k',
      '1k-10k',
      '10k-50k',
      '50k+',
      'nano',
      'micro',
      'mid',
      'macro',
    ]);
  });

  it('has a label for every bucket and no extra label keys', () => {
    for (const bucket of FOLLOWER_BUCKETS) {
      expect(FOLLOWER_BUCKET_LABELS[bucket]).toBeTruthy();
    }
    expect(Object.keys(FOLLOWER_BUCKET_LABELS).sort()).toEqual(
      [...FOLLOWER_BUCKETS].sort(),
    );
  });

  it('CREATOR_TIER_BUCKETS is the named-tier subset of FOLLOWER_BUCKETS', () => {
    expect([...CREATOR_TIER_BUCKETS]).toEqual(['nano', 'micro', 'mid', 'macro']);
    for (const tier of CREATOR_TIER_BUCKETS) {
      expect(FOLLOWER_BUCKETS).toContain(tier);
    }
  });
});

describe('CAMPAIGN_SORTS', () => {
  it('lists the supported sort values', () => {
    expect([...CAMPAIGN_SORTS]).toEqual([
      'relevance',
      'newest',
      'deadline',
      'reward',
      'most_applied',
    ]);
  });

  it('has a label for every sort key and no extra label keys', () => {
    for (const sort of CAMPAIGN_SORTS) {
      expect(CAMPAIGN_SORT_LABELS[sort]).toBeTruthy();
    }
    expect(Object.keys(CAMPAIGN_SORT_LABELS).sort()).toEqual(
      [...CAMPAIGN_SORTS].sort(),
    );
  });
});

describe('UPLOAD_FOLDERS', () => {
  it('lists the accepted upload folders', () => {
    expect([...UPLOAD_FOLDERS]).toEqual([
      'avatars',
      'logos',
      'campaigns',
      'portfolio',
      'submissions',
    ]);
  });
});
