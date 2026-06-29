import type { Metadata } from 'next';

import { serverApi } from '@/lib/api/server';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { AccountSettings } from '@/components/creator/account-settings';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata: Metadata = { title: 'Settings' };

export default async function CreatorSettingsPage() {
  const me = await serverApi.auth.me().catch(() => null);

  return (
    <DashboardContainer className="max-w-[760px]">
      <PageHeader title="Settings" subtitle="Manage your account, notifications, and appearance." />
      {me?.user ? (
        <AccountSettings user={me.user} />
      ) : (
        <EmptyState title="Couldn’t load your settings" description="Please refresh and try again." />
      )}
    </DashboardContainer>
  );
}
