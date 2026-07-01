/**
 * Maps an API `PublicCampaign` (a `Campaign` with its `business` joined) to the
 * `CampaignCardData` view-model the shared `CampaignCard` renders. One place so
 * Explore, the landing "live" rail, business profiles, and the campaign detail
 * "more from" list all denormalize a campaign identically.
 *
 * Note: the domain has no "spots" model, so we surface `applicationsCount`
 * (and, when known per-viewer, an `applicationStatus` badge) rather than a
 * spots-left counter.
 */
import type { PublicCampaign } from '@/lib/api/types';
import type { CampaignCardData } from '@/components/shared/campaign-card';

export interface ToCardOptions {
  /** Per-viewer application state, painted as a corner badge. */
  applicationStatus?: 'applied' | 'accepted' | 'rejected';
  /** Force the "closed" treatment (e.g. past campaigns on a business profile). */
  closed?: boolean;
}

export function toCampaignCardData(c: PublicCampaign, opts: ToCardOptions = {}): CampaignCardData {
  const firstDeliverable = c.deliverables?.[0];
  const city = c.isRemote ? 'Remote' : c.location?.city;

  return {
    id: c._id,
    title: c.title,
    category: c.category,
    coverImage: c.coverImage ?? null,
    business: {
      name: c.business?.businessName ?? 'A business',
      city,
      avatar: c.business?.logo ?? null,
    },
    reward: c.reward,
    platform: firstDeliverable?.platform,
    contentType: firstDeliverable?.contentType,
    quantity: firstDeliverable?.quantity,
    deadline: c.deadline,
    applicationsCount: c.applicationsCount,
    applicationStatus: opts.applicationStatus,
    closed: opts.closed ?? (c.status !== 'Active'),
  };
}
