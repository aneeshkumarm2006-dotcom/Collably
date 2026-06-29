'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type NotificationDot = 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'neutral';

export interface NotificationItem {
  id: string;
  text: React.ReactNode;
  time: string;
  unread?: boolean;
  dot?: NotificationDot;
  href?: string;
}

const DOT_CLASS: Record<NotificationDot, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-faint',
};

/**
 * NotificationBell — bell button with an unread count badge that opens a
 * dropdown of recent notifications (dot + text + time). Phase 10 wires it to
 * `GET /api/notifications`; here it renders whatever items it's given. The badge
 * prefers the server-authoritative `unreadCount` (which can exceed the handful of
 * items in the dropdown), falling back to counting the items when it's omitted.
 */
export interface NotificationBellProps {
  notifications: NotificationItem[];
  /** Total unread from the server; falls back to counting unread items. */
  unreadCount?: number;
  onMarkAllRead?: () => void;
  viewAllHref?: string;
  className?: string;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  viewAllHref = '#',
  className,
}: NotificationBellProps) {
  const unread = unreadCount ?? notifications.filter((n) => n.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className={cn(
            'relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-secondary hover:text-ink',
            className,
          )}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-card bg-danger px-1 font-mono text-[10px] font-bold leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-hair px-4 py-3.5">
          <h4 className="font-semibold text-ink">Notifications</h4>
          {onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            notifications.map((n) => {
              const inner = (
                <>
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      DOT_CLASS[n.dot ?? 'brand'],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-ink">{n.text}</p>
                    <div className="mt-0.5 text-[11px] text-faint">{n.time}</div>
                  </div>
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" />}
                </>
              );
              const cls = 'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-soft';
              return n.href ? (
                <Link key={n.id} href={n.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className={cls}>
                  {inner}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-hair p-3 text-center">
          <Link href={viewAllHref} className="text-[13px] font-semibold text-brand hover:underline">
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
