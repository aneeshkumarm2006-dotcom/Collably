/**
 * Map a campaign list to plottable points (Phase 11). A campaign contributes a
 * pin when it carries a coordinate: the exact `coordinates` for authorized
 * viewers, or the server-fuzzed `approxCoordinates` for everyone else (the
 * serializer guarantees the precise pin never reaches an unauthorized viewer).
 * Remote / not-yet-pinned campaigns are skipped.
 */
import type { PublicCampaign } from '@/lib/api/types';
import { formatCompactCurrency } from '@/lib/format';
import type { MapPoint } from './cluster';

export interface CampaignPointMeta {
  id: string;
  title: string;
  /** Short label shown in the value pill, e.g. "$180". */
  rewardLabel: string;
  category: string;
}

/** Best label for a campaign's reward pill on the map. */
function rewardLabel(campaign: PublicCampaign): string {
  const value = campaign.reward?.estimatedValue;
  if (typeof value === 'number' && value > 0) {
    return formatCompactCurrency(value);
  }
  return campaign.reward?.type ? campaign.reward.type.split(/[+ ]/)[0] : 'Reward';
}

export function campaignMapPoints(campaigns: PublicCampaign[]): MapPoint<CampaignPointMeta>[] {
  const points: MapPoint<CampaignPointMeta>[] = [];
  for (const c of campaigns) {
    if (c.isRemote) continue;
    const coord = c.location?.coordinates ?? c.location?.approxCoordinates;
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') continue;
    points.push({
      id: c._id,
      lat: coord.lat,
      lng: coord.lng,
      item: { id: c._id, title: c.title, rewardLabel: rewardLabel(c), category: c.category },
    });
  }
  return points;
}
