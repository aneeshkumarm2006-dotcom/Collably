import { Sparkles } from 'lucide-react';

import type { PublicCampaign } from '@/lib/api/types';
import { toCampaignCardData } from '@/lib/campaign-card';
import type { CardAppStatus } from '@/lib/creator/application-status';
import { CampaignCard } from '@/components/shared/campaign-card';

/**
 * "Matching your niche" rail on the authed creator Explore — a brand-tinted band
 * with a horizontally-scrolling set of relevance-ranked campaigns for the
 * creator's niches. Hidden when there's nothing to recommend.
 */
export function CreatorNicheRail({
  campaigns,
  niches,
  applicationStatusByCampaign,
}: {
  campaigns: PublicCampaign[];
  niches: string[];
  applicationStatusByCampaign?: Record<string, CardAppStatus>;
}) {
  if (campaigns.length === 0) return null;

  const nicheText =
    niches.length > 0 ? niches.slice(0, 3).join(' & ') : 'your niche';

  return (
    <section className="rounded-xl border border-brand/20 bg-brand-soft p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="font-bold text-ink">
            Matching your niche{' '}
            <span className="text-brand">
              {niches.length > 0 ? `— ${nicheText}` : ''}
            </span>
          </h2>
          <p className="text-[13px] text-muted">Hand-picked from your profile</p>
        </div>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {campaigns.map((c) => (
          <CampaignCard
            key={c._id}
            className="w-[min(260px,80vw)] shrink-0 sm:w-[260px]"
            campaign={toCampaignCardData(c, {
              applicationStatus: applicationStatusByCampaign?.[c._id],
            })}
          />
        ))}
      </div>
    </section>
  );
}
