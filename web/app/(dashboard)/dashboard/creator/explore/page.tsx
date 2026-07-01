import type { Metadata } from 'next';

import { serverApi } from '@/lib/api/server';
import type { CampaignListResponse } from '@/lib/api/types';
import { exploreStateFromSearchParams, paramsFromExplore } from '@/lib/explore-params';
import { applicationStatusByCampaign } from '@/lib/creator/application-status';
import { ExploreClient } from '@/components/explore/explore-client';
import { CreatorNicheRail } from '@/components/creator/niche-rail';

export const metadata: Metadata = { title: 'Explore Campaigns' };

export default async function CreatorExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialState = exploreStateFromSearchParams(sp);
  // Authed creators default to the personalized "Best match" sort.
  if (!sp.sort) initialState.sort = 'relevance';

  const [initialData, profileRes, appsRes, railRes] = await Promise.all([
    serverApi.campaigns.list(paramsFromExplore(initialState, 12)).catch(() => undefined as CampaignListResponse | undefined),
    serverApi.profiles.getCreator().catch(() => null),
    serverApi.applications.list({ limit: 50 }).catch(() => null),
    serverApi.campaigns.list({ sort: 'relevance', limit: 12 }).catch(() => null),
  ]);

  const statusMap = applicationStatusByCampaign(appsRes?.data ?? []);
  const niches = profileRes?.profile.niche ?? [];
  // Rail = fresh niche matches the creator hasn't engaged with yet.
  const railCampaigns = (railRes?.data ?? []).filter((c) => !statusMap[c._id]).slice(0, 6);

  return (
    <ExploreClient
      initialState={initialState}
      initialData={initialData}
      isGuest={false}
      applicationStatusByCampaign={statusMap}
      personalizedRail={
        railCampaigns.length > 0 ? (
          <CreatorNicheRail
            campaigns={railCampaigns}
            niches={niches}
            applicationStatusByCampaign={statusMap}
          />
        ) : undefined
      }
    />
  );
}
