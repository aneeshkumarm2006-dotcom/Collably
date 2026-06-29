import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';

import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessCampaignsClient } from '@/components/business/campaigns-client';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'My Campaigns' };

export default function BusinessCampaignsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="My Campaigns"
        subtitle="Create, manage, and track all your collab campaigns."
        action={
          <Button asChild>
            <Link href="/dashboard/business/campaigns/new">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </Button>
        }
      />
      <BusinessCampaignsClient />
    </DashboardContainer>
  );
}
