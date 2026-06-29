import type { Metadata } from 'next';

import { serverApi } from '@/lib/api/server';
import { getSession } from '@/lib/auth/session';
import { buildMetadata } from '@/lib/seo';
import type { CampaignListResponse } from '@/lib/api/types';
import {
  exploreStateFromSearchParams,
  paramsFromExplore,
} from '@/lib/explore-params';
import { ExploreClient } from '@/components/explore/explore-client';

export const metadata: Metadata = buildMetadata({
  title: 'Explore Campaigns',
  description:
    'Browse live gifting campaigns from local brands. Filter by category, location, reward, and platform, and apply to the collabs that fit your niche.',
  path: '/explore',
  ogEyebrow: 'Explore',
});

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialState = exploreStateFromSearchParams(sp);
  const session = await getSession();

  // Seed the first page server-side for a fast, SEO-friendly first paint.
  let initialData: CampaignListResponse | undefined;
  try {
    initialData = await serverApi.campaigns.list(paramsFromExplore(initialState, 12));
  } catch {
    initialData = undefined;
  }

  return (
    <ExploreClient initialState={initialState} initialData={initialData} isGuest={!session} />
  );
}
