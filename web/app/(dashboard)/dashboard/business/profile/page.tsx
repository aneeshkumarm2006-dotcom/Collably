import Link from 'next/link';
import type { Metadata } from 'next';
import { Clock, ExternalLink } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { getSession } from '@/lib/auth/session';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessProfileForm } from '@/components/business/business-profile-form';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Business Profile' };

export default async function BusinessProfilePage() {
  const [profileRes, session] = await Promise.all([
    serverApi.profiles.getBusiness().catch(() => null),
    getSession(),
  ]);
  const profile = profileRes?.profile ?? null;

  if (!profile) {
    return (
      <DashboardContainer>
        <PageHeader title="Business profile" />
        <div className="rounded-lg border border-hair bg-card">
          <EmptyState
            title="Finish setting up your profile"
            description="Complete onboarding to create your business profile."
            action={
              <Button asChild>
                <Link href="/onboarding/business">Go to onboarding</Link>
              </Button>
            }
          />
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer className="max-w-[760px]">
      <PageHeader
        title="Business profile"
        subtitle="This is what creators see on your profile and campaigns."
        action={
          <Button asChild variant="outline">
            <Link href={`/business/${profile._id}`} target="_blank">
              View public profile <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {session && !session.approved && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink">
          <Clock className="h-4 w-4 shrink-0 text-warn" />
          Your business is under review. You can edit your profile now; publishing campaigns unlocks
          once an admin verifies you.
        </div>
      )}

      <BusinessProfileForm profile={profile} />
    </DashboardContainer>
  );
}
