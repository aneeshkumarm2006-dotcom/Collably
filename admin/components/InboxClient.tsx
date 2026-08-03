'use client';

import { useState } from 'react';
import type { AdminConversation } from '@/lib/types';
import { InboxThread } from './InboxThread';

/**
 * Two-pane support inbox. LEFT: the conversation list (client-selectable rows).
 * RIGHT: the selected thread's live chat, or an empty state when nothing is
 * picked. Selection is local client state; the initial list comes from the
 * server component's `adminGet('/conversations')`.
 */
export function InboxClient({ conversations }: { conversations: AdminConversation[] }) {
  const openable = conversations.filter((c) => Boolean(c.creatorProfileId));
  const [selectedId, setSelectedId] = useState<string | null>(openable[0]?._id ?? null);
  const selected = conversations.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-hair bg-card shadow-card">
      {/* LEFT: conversation list */}
      <aside
        className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-hair"
        aria-label="Conversations"
      >
        <ul className="min-h-0 flex-1 overflow-y-auto py-2">
          {conversations.map((c) => {
            const name = c.creatorName?.trim() || 'Unknown creator';
            const initial = name.charAt(0).toUpperCase() || '?';
            const hasUnread = typeof c.unread === 'number' && c.unread > 0;
            const openableRow = Boolean(c.creatorProfileId);
            const active = c._id === selectedId;
            return (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => openableRow && setSelectedId(c._id)}
                  disabled={!openableRow}
                  aria-current={active ? 'true' : undefined}
                  title={
                    openableRow ? undefined : 'This conversation has no creator profile to open.'
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    active
                      ? 'bg-brand-soft'
                      : openableRow
                        ? 'hover:bg-elev'
                        : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <span
                    className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(150deg,#2D88FF,#1877F2)] text-base font-extrabold text-white"
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-extrabold tracking-tight text-ink">
                        {name}
                      </span>
                      {c.lastMessageAt && (
                        <time
                          dateTime={c.lastMessageAt}
                          className="ml-auto shrink-0 text-[11.5px] font-semibold text-faint"
                        >
                          {formatRelative(c.lastMessageAt)}
                        </time>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          hasUnread ? 'font-semibold text-ink' : 'text-muted'
                        }`}
                      >
                        {c.lastMessage?.trim() || 'No messages yet.'}
                      </span>
                      {hasUnread && (
                        <span
                          className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white"
                          aria-label={`${c.unread} unread`}
                        >
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* RIGHT: active thread or empty state */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected && selected.creatorProfileId ? (
          <InboxThread
            key={selected.creatorProfileId}
            creatorId={selected.creatorProfileId}
            creatorName={selected.creatorName?.trim() || 'Unknown creator'}
          />
        ) : (
          <div className="m-auto flex max-w-xs flex-col items-center gap-3 px-6 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl bg-elev text-muted"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <p className="text-[15px] font-bold text-ink">Select a conversation</p>
            <p className="text-[13px] text-muted">
              Pick a creator on the left to view the thread and reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Short relative label for the list rows (e.g. "3m", "2h", "Apr 5"). */
function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
