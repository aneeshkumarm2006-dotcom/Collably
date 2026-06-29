import type { Metadata } from 'next';

import { getSession } from '@/lib/auth/session';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { ConversationList } from '@/components/chat/conversation-list';

export const metadata: Metadata = { title: 'Messages' };

export default async function BusinessMessagesPage() {
  const session = await getSession();
  return (
    <DashboardContainer className="max-w-[820px]">
      <PageHeader title="Messages" subtitle="Chat with the creators working on your campaigns." />
      <ConversationList role="business" meId={session!.user.id} />
    </DashboardContainer>
  );
}
