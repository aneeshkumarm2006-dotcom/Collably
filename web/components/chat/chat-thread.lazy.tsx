'use client';

import dynamic from 'next/dynamic';

import type { UserRole } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lazy boundary for the chat thread. The thread pulls in the message timeline,
 * composer, and `socket.io-client` transport — none of which the rest of the
 * dashboard needs — so it's split out of the shared bundle and fetched on the
 * client only when a conversation is opened. A skeleton holds the layout.
 */
const ChatThreadImpl = dynamic(
  () => import('./chat-thread').then((m) => m.ChatThread),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-16 w-2/3 rounded-xl" />
          <Skeleton className="ml-auto h-16 w-1/2 rounded-xl" />
          <Skeleton className="h-16 w-3/5 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    ),
  },
);

export function ChatThread(props: {
  conversationId: string;
  role: 'creator' | 'business';
  me: { id: string; role: UserRole };
}) {
  return <ChatThreadImpl {...props} />;
}
