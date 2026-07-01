import type { Metadata } from 'next';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessCollabsClient } from '@/components/business/collabs-client';

export const metadata: Metadata = { title: 'Active Collabs' };

export default function BusinessCollabsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="Active Collabs"
        subtitle="Creators you’ve accepted are working on their deliverables."
      />
      <BusinessCollabsClient />
    </DashboardContainer>
  );
}
