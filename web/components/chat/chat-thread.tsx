'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MessageSquare } from 'lucide-react';

import type { UserRole } from '@/lib/constants';
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '@/lib/api/queries';
import { getSocket } from '@/lib/socket';
import { errorMessage } from '@/lib/api/errors';
import { toast } from '@/lib/toast';
import { dayLabel, sameDay } from '@/lib/chat/time';
import { Avatar } from '@/components/shared/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatComposer } from './chat-composer';
import { DateSeparator, MessageBubble, TypingBubble } from './message-bubble';

interface TypingPayload {
  conversationId?: string;
  fromUserId?: string;
  isTyping?: boolean;
}

/**
 * One chat thread: header (other participant + collab context), the scrolling
 * message timeline, and the composer. Role-agnostic; the API returns viewer-
 * relative data. Loads history (cursor-paged, newest-first), sends optimistically,
 * marks the thread read on open and on each new incoming message, and relays
 * typing indicators over the socket. `useDashboardRealtime` (mounted in the shell)
 * keeps the cache live; this component drives reads/sends + local typing state.
 */
export function ChatThread({
  conversationId,
  role,
  me,
}: {
  conversationId: string;
  role: 'creator' | 'business';
  me: { id: string; role: UserRole };
}) {
  const convo = useConversation(conversationId);
  const history = useMessages(conversationId);
  const send = useSendMessage(conversationId, me);
  const markRead = useMarkConversationRead(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const typingClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);

  const conversation = convo.data?.conversation;
  const other = conversation?.otherParticipant;
  const otherUserId = other?._id;

  // Newest-first across all loaded pages (matches the bubble grouping logic).
  const messages = history.data?.pages.flatMap((p) => p.messages) ?? [];
  const newest = messages[0];

  // Typing indicator (other side), with a short auto-clear.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onTyping = (p: TypingPayload) => {
      if (p?.conversationId !== conversationId) return;
      setOtherTyping(Boolean(p.isTyping));
      if (typingClear.current) clearTimeout(typingClear.current);
      if (p.isTyping) typingClear.current = setTimeout(() => setOtherTyping(false), 4000);
    };
    socket.on('typing', onTyping);
    return () => {
      socket.off('typing', onTyping);
      if (typingClear.current) clearTimeout(typingClear.current);
    };
  }, [conversationId]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = getSocket();
      if (socket && otherUserId) {
        socket.emit('typing', { conversationId, toUserId: otherUserId, isTyping });
      }
    },
    [conversationId, otherUserId],
  );

  // Mark read on open and whenever a NEW INCOMING message arrives.
  const newestId = newest?._id;
  const newestIncoming = Boolean(newest) && newest.senderUserId !== me.id;
  useEffect(() => {
    if (conversationId) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  useEffect(() => {
    if (newestId && newestIncoming) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestId, newestIncoming]);

  // Auto-load older history when the top sentinel scrolls into view.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = history;
  useEffect(() => {
    const node = topSentinel.current;
    const root = scrollRef.current;
    if (!node || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function onSend(body: string) {
    send.mutate(body, {
      onError: (err) => toast.error(errorMessage(err, 'Message failed to send.')),
    });
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-page md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-hair bg-card px-4 py-3">
        <Link
          href={`/dashboard/${role}/messages`}
          aria-label="Back to messages"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-secondary hover:text-ink md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {convo.isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <Avatar name={other?.name ?? 'Chat'} src={other?.avatar} size={40} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{other?.name ?? 'Conversation'}</div>
              <div className="truncate text-[12px] text-muted">
                {otherTyping ? 'typing…' : (conversation?.campaignTitle ?? 'Collab chat')}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collab context strip */}
      {conversation?.campaignTitle && (
        <div className="flex items-center gap-2 bg-brand-soft px-4 py-2 text-[12.5px] font-semibold text-brand">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Collab · {conversation.campaignTitle}</span>
        </div>
      )}

      {/* Timeline (column-reverse → newest pinned to the bottom) */}
      {history.isError ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<MessageSquare />}
            title="Couldn’t load this conversation"
            description="Something went wrong. Please try again."
            action={
              <Button variant="outline" onClick={() => history.refetch()}>
                Retry
              </Button>
            }
          />
        </div>
      ) : history.isLoading ? (
        <div className="flex-1 space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={i % 2 ? 'ml-auto h-10 w-1/2' : 'h-10 w-2/5'} />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<MessageSquare />}
            title="No messages yet"
            description={`Say hello to ${other?.name ?? 'your collaborator'} to get the conversation started.`}
          />
        </div>
      ) : (
        <div ref={scrollRef} className="flex flex-1 flex-col-reverse overflow-y-auto py-3">
          {otherTyping && <TypingBubble />}
          {messages.map((m, i) => {
            const older = messages[i + 1]; // newest-first → next item is chronologically earlier
            const firstOfDay = !older || !sameDay(older.createdAt, m.createdAt);
            const tight =
              Boolean(older) &&
              older.senderUserId === m.senderUserId &&
              sameDay(older.createdAt, m.createdAt);
            return (
              <Fragment key={m._id}>
                {/* DOM order is reversed by col-reverse, so the separator (rendered
                    after the bubble) appears visually above the day's first message. */}
                <MessageBubble message={m} mine={m.senderUserId === me.id} tight={tight} />
                {firstOfDay && <DateSeparator label={dayLabel(m.createdAt)} />}
              </Fragment>
            );
          })}
          {history.isFetchingNextPage && (
            <p className="py-2 text-center text-[12px] text-faint">Loading earlier messages…</p>
          )}
          {history.hasNextPage && <div ref={topSentinel} className="h-1" />}
        </div>
      )}

      <ChatComposer onSend={onSend} onTyping={emitTyping} disabled={convo.isError} />
    </div>
  );
}
