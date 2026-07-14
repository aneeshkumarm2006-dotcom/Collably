/**
 * Location-precision policy for campaign serialization (On-Site Location feature).
 *
 * A campaign's exact pin is only ever revealed to an admin, the owning business, or
 * a creator with an Accepted/Completed application — everyone else gets a fuzzed
 * point (see `serializeCampaignLocation`). That rule is security-relevant, so it
 * lives here once and is shared by every route that serializes a campaign rather
 * than being re-derived per route.
 */
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { Application } from '../models/Application';
import type { CampaignDoc } from '../models/Campaign';
import type { CampaignViewerContext } from './serialize';

/** String id of a campaign's business ref, whether it's populated or a raw id. */
export function campaignBusinessId(c: CampaignDoc): string {
  const b = c.businessId as unknown as { _id?: unknown };
  if (b && typeof b === 'object' && '_id' in b && b._id) return String(b._id);
  return String(c.businessId);
}

/**
 * Resolve the policy for the current request. Does the per-role lookups **once**,
 * then returns a cheap per-campaign classifier, so serializing a page of campaigns
 * costs a constant number of queries rather than one per row.
 */
export async function resolveCampaignViewer(
  req: Express.Request,
): Promise<(c: CampaignDoc) => CampaignViewerContext> {
  const role = req.user?.role;

  if (role === 'admin') return () => ({ role: 'admin' });

  if (role === 'business') {
    const profile = await BusinessProfile.findOne({ userId: req.user!._id }).select('_id');
    const pid = profile?._id?.toString();
    return (c) => ({ role: 'business', isOwner: !!pid && campaignBusinessId(c) === pid });
  }

  if (role === 'creator') {
    const creator = await CreatorProfile.findOne({ userId: req.user!._id }).select('_id');
    if (!creator) return () => ({ role: 'creator' });
    const accepted = await Application.find({
      creatorId: creator._id,
      status: { $in: ['Accepted', 'Completed'] },
    }).select('campaignId');
    const acceptedSet = new Set(accepted.map((a) => a.campaignId.toString()));
    return (c) => ({ role: 'creator', isAcceptedCreator: acceptedSet.has(c.id) });
  }

  return () => ({ role: 'guest' });
}
