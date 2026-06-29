import type { Metadata } from 'next';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { NotificationsClient } from '@/components/creator/notifications-client';

export const metadata: Metadata = { title: 'Notifications' };

export default function BusinessNotificationsPage() {
  return (
    <DashboardContainer className="max-w-[760px]">
      <PageHeader title="Notifications" subtitle="Everything happening with your campaigns." />
      <NotificationsClient role="business" />
    </DashboardContainer>
  );
}
