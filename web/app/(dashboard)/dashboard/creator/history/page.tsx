import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink, History } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { formatDate } from '@/lib/format';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CreatorApplicationRow } from '@/components/creator/application-row';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'History' };

export default async function CreatorHistoryPage() {
  const res = await serverApi.applications
    .list({ status: 'Completed', limit: 50 })
    .catch(() => null);
  const completed = (res?.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        +new Date(b.verifiedAt ?? b.updatedAt ?? b.createdAt) -
        +new Date(a.verifiedAt ?? a.updatedAt ?? a.createdAt),
    );

  return (
    <DashboardContainer>
      <PageHeader title="History" subtitle="Every collab you've completed." />

      {completed.length === 0 ? (
        <div className="rounded-lg border border-hair bg-card">
          <EmptyState
            icon={<History />}
            title="No completed collabs yet"
            description="Once a brand verifies your submission, the finished collab is recorded here."
            action={
              <Button asChild>
                <Link href="/dashboard/creator/explore">Browse campaigns</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map((a) => (
            <CreatorApplicationRow
              key={a._id}
              application={a}
              dateLabel={a.verifiedAt ? `Completed ${formatDate(a.verifiedAt)}` : 'Completed'}
              actions={
                a.submissionLink ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={a.submissionLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> View post
                    </a>
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </DashboardContainer>
  );
}
