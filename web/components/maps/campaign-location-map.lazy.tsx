'use client';

import dynamic from 'next/dynamic';

import type { CampaignLocation } from '@/lib/shared';
import { MapStatePanel } from './map-frame';

/**
 * Lazy boundary for the campaign-detail location map. The Google Maps JS loader +
 * map component are only fetched on the client, after the (statically cached /
 * ISR'd) campaign page hydrates, keeping the maps code out of the initial bundle
 * and off the server. A skeleton panel holds the layout while it loads.
 */
const CampaignLocationMapImpl = dynamic(
  () => import('./campaign-location-map').then((m) => m.CampaignLocationMap),
  {
    ssr: false,
    loading: () => <MapStatePanel status="loading" className="h-64" />,
  },
);

export function CampaignLocationMap(props: { location: CampaignLocation; className?: string }) {
  return <CampaignLocationMapImpl {...props} />;
}
