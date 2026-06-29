'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { SessionUser } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import { NotificationBell, type NotificationItem } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserMenu } from '@/components/shared/user-menu';

export interface Crumb {
  label: string;
  href?: string;
}

export interface DashboardTopBarProps {
  breadcrumbs: Crumb[];
  user: Pick<SessionUser, 'name' | 'email' | 'role' | 'avatar'>;
  notifications?: NotificationItem[];
  /** Server-authoritative unread count for the bell badge (may exceed the items shown). */
  unreadNotifications?: number;
  onMarkAllRead?: () => void;
  /** "View all notifications" target for the bell dropdown. */
  notificationsHref?: string;
  onLogout?: () => void;
  className?: string;
}

/** DashboardTopBar — breadcrumb on the left; theme toggle + bell + avatar menu. */
export function DashboardTopBar({
  breadcrumbs,
  user,
  notifications = [],
  unreadNotifications,
  onMarkAllRead,
  notificationsHref,
  onLogout,
  className,
}: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-hair bg-card px-5 sm:px-6',
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-muted">
        {breadcrumbs.map((c, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
              {c.href && !last ? (
                <Link href={c.href} className="truncate transition-colors hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className={cn('truncate', last && 'font-semibold text-ink')}>{c.label}</span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" />}
            </span>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadNotifications}
          onMarkAllRead={onMarkAllRead}
          viewAllHref={notificationsHref}
        />
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
