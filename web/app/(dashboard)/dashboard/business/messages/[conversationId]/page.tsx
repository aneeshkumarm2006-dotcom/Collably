import type { Metadata } from 'next';

import { getSession } from '@/lib/auth/session';
import { ChatThread } from '@/components/chat/chat-thread.lazy';

export const metadata: Metadata = { title: 'Chat' };

export default async function BusinessChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await getSession();
  return (
    <ChatThread
      conversationId={conversationId}
      role="business"
      me={{ id: session!.user.id, role: session!.user.role }}
    />
  );
}
