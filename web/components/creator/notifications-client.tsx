'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';

import { useInfiniteNotifications, useMarkAllNotificationsRead } from '@/lib/api/queries';
import { NOTIF_CHIP_CLASS, notificationHref, notificationVisual } from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationsClient({ role }: { role: 'creator' | 'business' }) {
  const query = useInfiniteNotifications({ limit: 20 });
  const markAll = useMarkAllNotificationsRead();

  const notifications = query.data?.pages.flatMap((p) => p.data) ?? [];
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAll.mutate()}
          disabled={unreadCount === 0 || markAll.isPending}
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<Bell />}
          title="Couldn’t load notifications"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="No notifications yet"
          description="Updates about your applications, collabs, and submissions will show up here."
        />
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border border-hair bg-card shadow-sm">
            {notifications.map((n) => {
              const { icon: Icon, dot } = notificationVisual(n.type);
              return (
                <li key={n._id} className="border-b border-hair last:border-b-0">
                  <Link
                    href={notificationHref(n.deepLinkPath, role)}
                    className={cn(
                      'flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-brand-soft',
                      !n.isRead && 'bg-brand-soft/40',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&_svg]:h-[18px] [&_svg]:w-[18px]',
                        NOTIF_CHIP_CLASS[dot],
                      )}
                    >
                      <Icon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-ink">{n.message}</p>
                      <p className="mt-0.5 text-[12px] text-faint">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" aria-label="Unread" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {query.hasNextPage && (
            <div className="mt-5 text-center">
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
