import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { serverApi } from '@/lib/api/server';
import { DashboardContainer } from '@/components/dashboard/page-shell';
import { SubmitContentClient } from '@/components/creator/submit-content-client';

export const metadata: Metadata = { title: 'Submit Content' };

export default async function SubmitContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The backend scopes this to participants (404/403 for anyone else) → notFound.
  const application = await serverApi.applications
    .get(id)
    .then((r) => r.application)
    .catch(() => null);
  if (!application) notFound();

  return (
    <DashboardContainer className="max-w-[680px]">
      <SubmitContentClient application={application} />
    </DashboardContainer>
  );
}
