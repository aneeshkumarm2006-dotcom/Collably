import Link from 'next/link';
import type { Metadata } from 'next';
import { Handshake } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CreatorCollabCard, compareCollabPriority } from '@/components/creator/creator-collab-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Active Collabs' };

export default async function CreatorCollabsPage() {
  const res = await serverApi.applications
    .list({ status: 'Accepted,Overdue', limit: 50 })
    .catch(() => null);
  const collabs = (res?.data ?? []).slice().sort(compareCollabPriority);

  return (
    <DashboardContainer>
      <PageHeader
        title="Active Collabs"
        subtitle="Campaigns you've been accepted to. Take action before the deadline."
      />

      {collabs.length === 0 ? (
        <div className="rounded-lg border border-hair bg-card">
          <EmptyState
            icon={<Handshake />}
            title="No active collabs"
            description="When a business accepts your application, the collab shows up here with its deliverables and deadline."
            action={
              <Button asChild>
                <Link href="/dashboard/creator/explore">Browse campaigns</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {collabs.map((a) => (
            <CreatorCollabCard key={a._id} application={a} />
          ))}
        </div>
      )}
    </DashboardContainer>
  );
}
