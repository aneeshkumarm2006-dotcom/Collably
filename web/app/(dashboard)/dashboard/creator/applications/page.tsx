import type { Metadata } from 'next';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CreatorApplicationsClient } from '@/components/creator/applications-client';

export const metadata: Metadata = { title: 'My Applications' };

export default function CreatorApplicationsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="My Applications"
        subtitle="Track every campaign you've applied to."
      />
      <CreatorApplicationsClient />
    </DashboardContainer>
  );
}
