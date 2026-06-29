'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Search, SearchX, X } from 'lucide-react';

import type { Conversation } from '@/lib/shared';
import { useConversations } from '@/lib/api/queries';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import { Avatar } from '@/components/shared/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'unread';

/**
 * The Messages list: a search field + All/Unread filter above the thread rows.
 * Role-agnostic (the API returns viewer-relative data); rows link into the
 * current role's thread route. Kept live by the conversation-list query (which
 * `useDashboardRealtime` invalidates on incoming messages).
 */
export function ConversationList({ role, meId }: { role: 'creator' | 'business'; meId: string }) {
  const query = useConversations({ limit: 50 });
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const conversations = useMemo(() => query.data?.data ?? [], [query.data]);
  const unreadTotal = useMemo(
    () => conversations.filter((c) => (c.unreadCount ?? 0) > 0).length,
    [conversations],
  );

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === 'unread' && (c.unreadCount ?? 0) === 0) return false;
      if (!q) return true;
      return (
        (c.otherParticipant?.name ?? '').toLowerCase().includes(q) ||
        (c.campaignTitle ?? '').toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, text, filter]);

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="Couldn’t load your messages"
        description="Something went wrong. Please try again."
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-11 w-full rounded-lg border border-hair bg-card pl-10 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterPill
          label={unreadTotal > 0 ? `Unread ${unreadTotal}` : 'Unread'}
          active={filter === 'unread'}
          onClick={() => setFilter('unread')}
        />
      </div>

      {shown.length === 0 ? (
        text || filter === 'unread' ? (
          <EmptyState icon={<SearchX />} title="No chats found" description="Try a different search or filter." />
        ) : (
          <EmptyState
            icon={<MessageSquare />}
            title="No messages yet"
            description="When a collab connects you with a brand or creator, your chat shows up here."
          />
        )
      ) : (
        <ul className="overflow-hidden rounded-xl border border-hair bg-card shadow-sm">
          {shown.map((c) => (
            <ConversationRow key={c._id} conversation={c} meId={meId} role={role} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-hair bg-card text-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

function ConversationRow({
  conversation: c,
  meId,
  role,
}: {
  conversation: Conversation;
  meId: string;
  role: 'creator' | 'business';
}) {
  const pathname = usePathname() ?? '';
  const href = `/dashboard/${role}/messages/${c._id}`;
  const active = pathname === href;
  const unread = c.unreadCount ?? 0;
  const other = c.otherParticipant;
  const mineLast = c.lastSenderUserId === meId;
  const preview = c.lastMessage
    ? `${mineLast ? 'You: ' : ''}${c.lastMessage}`
    : 'No messages yet. Say hello.';

  return (
    <li className="border-b border-hair last:border-b-0">
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-soft/50',
          active && 'bg-brand-soft/60',
        )}
      >
        <Avatar name={other?.name ?? 'Chat'} src={other?.avatar} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold text-ink">{other?.name ?? 'Conversation'}</span>
            {c.lastMessageAt && (
              <span className="shrink-0 text-[11px] text-faint">
                {formatRelativeTime(c.lastMessageAt)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-[13px]',
                unread > 0 ? 'font-medium text-ink' : 'text-muted',
              )}
            >
              {preview}
            </span>
            {unread > 0 && (
              <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 font-mono text-[11px] font-bold leading-none text-white">
                {unread}
              </span>
            )}
          </div>
          {c.campaignTitle && (
            <span className="mt-0.5 block truncate text-[11px] text-faint">{c.campaignTitle}</span>
          )}
        </div>
      </Link>
    </li>
  );
}
