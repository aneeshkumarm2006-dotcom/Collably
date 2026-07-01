import type { Metadata } from 'next';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessSubmissionsClient } from '@/components/business/submissions-client';

export const metadata: Metadata = { title: 'Submissions' };

export default function BusinessSubmissionsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="Submissions to Review"
        subtitle="Verify creator content before marking collabs complete."
      />
      <BusinessSubmissionsClient />
    </DashboardContainer>
  );
}
