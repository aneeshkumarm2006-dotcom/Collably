import type { Metadata } from 'next';

import { getSession } from '@/lib/auth/session';
import { emptyCampaignForm } from '@/lib/business/campaign-form';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CampaignForm } from '@/components/business/campaign-form';

export const metadata: Metadata = { title: 'New Campaign' };

export default async function NewCampaignPage() {
  const session = await getSession();

  return (
    <DashboardContainer className="max-w-[820px]">
      <PageHeader
        title="New campaign"
        subtitle="Post a collab opportunity for creators to discover and apply to."
      />
      <CampaignForm mode="create" initial={emptyCampaignForm()} canPublish={Boolean(session?.approved)} />
    </DashboardContainer>
  );
}
