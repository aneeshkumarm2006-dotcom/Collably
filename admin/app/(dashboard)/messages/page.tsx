import { adminGet } from '@/lib/backend';
import type { AdminConversation } from '@/lib/types';
import { MessageThread } from '@/components/MessageThread';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function MessagesPage() {
  let rows: AdminConversation[] = [];
  let error: string | null = null;
  try {
    const res = await adminGet<{ data: AdminConversation[] }>('/conversations');
    rows = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Support inbox for creator conversations, newest activity first."
        count={error ? undefined : rows.length}
      />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No conversations yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => {
            const name = c.creatorName?.trim() || 'Unknown creator';
            const initial = name.charAt(0).toUpperCase() || '?';
            const hasUnread = typeof c.unread === 'number' && c.unread > 0;
            return (
              <li
                key={c._id}
                className="flex items-center gap-3.5 rounded-2xl border border-hair bg-card py-4 pl-5 pr-5 shadow-card"
              >
                <span
                  className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[13px] bg-[linear-gradient(150deg,#2D88FF,#1877F2)] text-lg font-extrabold text-white"
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-extrabold tracking-tight text-ink">
                      {name}
                    </h3>
                    {hasUnread && (
                      <span
                        className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white"
                        aria-label={`${c.unread} unread`}
                      >
                        {c.unread}
                      </span>
                    )}
                    {c.lastMessageAt && (
                      <time
                        dateTime={c.lastMessageAt}
                        className="ml-auto shrink-0 text-[12px] font-semibold text-faint"
                      >
                        {formatTime(c.lastMessageAt)}
                      </time>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 truncate text-[13px] ${
                      hasUnread ? 'font-semibold text-ink' : 'text-muted'
                    }`}
                  >
                    {c.lastMessage?.trim() || 'No messages yet.'}
                  </p>
                </div>
                <div className="shrink-0">
                  {c.creatorProfileId ? (
                    <MessageThread creatorId={c.creatorProfileId} creatorName={name} />
                  ) : (
                    <span
                      title="This conversation has no creator profile to open."
                      className="inline-block rounded-md border border-hair bg-elev px-3.5 py-2 text-sm font-semibold text-faint"
                    >
                      Unavailable
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
