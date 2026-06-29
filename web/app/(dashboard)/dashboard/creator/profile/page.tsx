import Link from 'next/link';
import type { Metadata } from 'next';
import { Clock, ExternalLink } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { getSession } from '@/lib/auth/session';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CreatorProfileForm } from '@/components/creator/creator-profile-form';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Edit Profile' };

export default async function CreatorProfilePage() {
  const [profileRes, session] = await Promise.all([
    serverApi.profiles.getCreator().catch(() => null),
    getSession(),
  ]);
  const profile = profileRes?.profile ?? null;

  if (!profile) {
    return (
      <DashboardContainer>
        <PageHeader title="Edit profile" />
        <div className="rounded-lg border border-hair bg-card">
          <EmptyState
            title="Finish setting up your profile"
            description="Complete onboarding to create your creator profile."
            action={
              <Button asChild>
                <Link href="/onboarding/creator">Go to onboarding</Link>
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
        title="Edit profile"
        subtitle="Keep your profile sharp — brands see this when you apply."
        action={
          <Button asChild variant="outline">
            <Link href={`/creator/${profile._id}`} target="_blank">
              View public profile <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {session && !session.approved && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink">
          <Clock className="h-4 w-4 shrink-0 text-warn" />
          Your creator account is under review. You can edit your profile now — applying unlocks once
          an admin verifies you.
        </div>
      )}

      <CreatorProfileForm profile={profile} />
    </DashboardContainer>
  );
}
