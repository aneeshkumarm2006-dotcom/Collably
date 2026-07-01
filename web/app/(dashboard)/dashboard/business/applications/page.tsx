import type { Metadata } from 'next';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessApplicationsClient } from '@/components/business/applications-client';

export const metadata: Metadata = { title: 'Applications' };

export default function BusinessApplicationsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="Applications"
        subtitle="Review creators who applied across all your campaigns."
      />
      <BusinessApplicationsClient />
    </DashboardContainer>
  );
}
