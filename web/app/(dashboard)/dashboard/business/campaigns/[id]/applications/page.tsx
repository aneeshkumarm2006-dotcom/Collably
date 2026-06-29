import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, Calendar } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { categoryEmoji, categoryGradient } from '@/lib/domain-meta';
import { formatDate } from '@/lib/format';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { BusinessApplicationsClient } from '@/components/business/applications-client';
import { RewardPill } from '@/components/shared/reward-pill';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Campaign Applications' };

export default async function CampaignApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [res, profileRes] = await Promise.all([
    serverApi.campaigns.get(id).catch(() => null),
    serverApi.profiles.getBusiness().catch(() => null),
  ]);

  // Only the owning business may review a campaign's applicants.
  const ownsIt = profileRes?.profile?._id && res?.campaign.businessId === profileRes.profile._id;
  if (!res?.campaign || !ownsIt) notFound();
  const c = res.campaign;

  return (
    <DashboardContainer>
      <PageHeader
        title="Applications"
        subtitle={`Creators who applied to “${c.title}”.`}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/business/campaigns">
              <ArrowLeft className="h-4 w-4" /> All campaigns
            </Link>
          </Button>
        }
      />

      {/* Campaign banner */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-hair bg-card p-4 shadow-sm">
        <div
          className="relative h-[56px] w-[80px] shrink-0 overflow-hidden rounded-md bg-secondary"
          style={{ background: categoryGradient(c.category) }}
        >
          {c.coverImage ? (
            <Image src={c.coverImage} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-lg opacity-90">
              {categoryEmoji(c.category)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="truncate font-bold text-ink">{c.title}</h2>
            <StatusBadge status={c.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <RewardPill reward={c.reward} />
            {c.deadline && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                <Calendar className="h-3.5 w-3.5" /> Deadline {formatDate(c.deadline)}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-2xl font-semibold text-ink">{c.applicationsCount}</div>
          <div className="text-[12px] text-muted">application{c.applicationsCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      <BusinessApplicationsClient campaignId={id} />
    </DashboardContainer>
  );
}
