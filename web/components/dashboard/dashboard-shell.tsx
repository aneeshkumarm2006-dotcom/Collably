'use client';

/**
 * The persistent dashboard chrome (Phase 7/8) — role-aware sidebar + sticky top
 * bar wrapped around the routed page. Breadcrumbs are derived from the pathname
 * (so pages don't thread them), the bell is wired live to the notifications feed,
 * and logout flows through the auth context. Used by both the creator and
 * business dashboard layouts.
 */
import { usePathname } from 'next/navigation';

import type { SessionUser } from '@/lib/auth/user';
import { useConversations, useNotifications, useMarkAllNotificationsRead } from '@/lib/api/queries';
import { dashboardBreadcrumbs } from '@/lib/dashboard/breadcrumbs';
import { toNotificationItems } from '@/lib/notifications';
import { toast } from '@/lib/toast';
import { useDashboardRealtime } from '@/lib/realtime/use-dashboard-realtime';
import { useAuth } from '@/components/providers/auth-provider';
import { DASH_NAV, DashboardSidebar } from '@/components/shared/dashboard-sidebar';
import { DashboardTopBar } from '@/components/shared/dashboard-topbar';

export function DashboardShell({
  role,
  user,
  children,
}: {
  role: 'creator' | 'business';
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? `/dashboard/${role}`;
  const { logout } = useAuth();
  const notifications = useNotifications({ limit: 8 });
  const markAll = useMarkAllNotificationsRead();
  const conversations = useConversations({ limit: 50 });

  // Live realtime wiring (chat + notifications, socket → Query cache); mounted
  // once per session.
  useDashboardRealtime();

  const items = toNotificationItems(notifications.data?.data ?? [], role);
  const unreadNotifications = notifications.data?.unreadCount ?? 0;
  const onLogout = () => void logout();

  // Total unread messages → the Messages sidebar badge.
  const unreadMessages = (conversations.data?.data ?? []).reduce(
    (sum, c) => sum + (c.unreadCount ?? 0),
    0,
  );
  const messagesHref = `/dashboard/${role}/messages`;
  const navItems = DASH_NAV[role].main.map((item) =>
    item.href === messagesHref && unreadMessages > 0 ? { ...item, badge: unreadMessages } : item,
  );

  return (
    <div className="flex min-h-screen bg-page">
      <DashboardSidebar
        role={role}
        user={{ name: user.name, role: user.role, avatar: user.avatar }}
        items={navItems}
        onLogout={onLogout}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar
          breadcrumbs={dashboardBreadcrumbs(pathname, role)}
          user={user}
          notifications={items}
          unreadNotifications={unreadNotifications}
          onMarkAllRead={() =>
            markAll.mutate(undefined, {
              onError: () => toast.error("Couldn't mark notifications read"),
            })
          }
          notificationsHref={`/dashboard/${role}/notifications`}
          onLogout={onLogout}
        />
        {/* Bottom padding on mobile clears the fixed bottom tab bar. */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
