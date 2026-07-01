'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  FileText,
  Handshake,
  History,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/avatar';
import { BrandGlyph, BrandMark } from '@/components/shared/brand-mark';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface DashNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
}

/** Default role-aware navigation (routes match TODO Phases 7 & 8). */
export const DASH_NAV: Record<'creator' | 'business', { main: DashNavItem[]; account: DashNavItem[] }> =
  {
    creator: {
      main: [
        { label: 'Overview', href: '/dashboard/creator', icon: LayoutDashboard },
        { label: 'Explore', href: '/dashboard/creator/explore', icon: Compass },
        { label: 'My Applications', href: '/dashboard/creator/applications', icon: FileText },
        { label: 'Active Collabs', href: '/dashboard/creator/collabs', icon: Handshake },
        { label: 'Messages', href: '/dashboard/creator/messages', icon: MessageSquare },
        { label: 'History', href: '/dashboard/creator/history', icon: History },
      ],
      account: [
        { label: 'Profile', href: '/dashboard/creator/profile', icon: Sparkles },
        { label: 'Settings', href: '/dashboard/creator/settings', icon: Settings },
      ],
    },
    business: {
      main: [
        { label: 'Overview', href: '/dashboard/business', icon: LayoutDashboard },
        { label: 'My Campaigns', href: '/dashboard/business/campaigns', icon: Megaphone },
        { label: 'Applications', href: '/dashboard/business/applications', icon: FileText },
        { label: 'Active Collabs', href: '/dashboard/business/collabs', icon: Handshake },
        { label: 'Submissions', href: '/dashboard/business/submissions', icon: Upload },
        { label: 'Messages', href: '/dashboard/business/messages', icon: MessageSquare },
      ],
      account: [
        { label: 'Profile', href: '/dashboard/business/profile', icon: Building2 },
        { label: 'Settings', href: '/dashboard/business/settings', icon: Settings },
      ],
    },
  };

export interface DashboardSidebarProps {
  role: 'creator' | 'business';
  user: { name: string; role?: string; avatar?: string | null };
  items?: DashNavItem[];
  accountItems?: DashNavItem[];
  onLogout?: () => void;
  defaultCollapsed?: boolean;
  className?: string;
}

function useActive(rootHref: string) {
  const pathname = usePathname() ?? '';
  return (href: string) =>
    href === rootHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const ACTIVE_BG = 'bg-[rgba(24,119,242,0.28)]';

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: DashNavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? cn('border-brand text-white', ACTIVE_BG)
          : 'border-transparent text-white/65 hover:bg-dark-panel hover:text-white',
        collapsed && 'justify-center px-0',
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge != null && (
        <span
          className={cn(
            'ml-auto rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none',
            active ? 'bg-brand text-white' : 'bg-white/10 text-white',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

/**
 * DashboardSidebar: always-dark, role-aware nav. Collapsible to an icon rail on
 * desktop (tooltips on hover); collapses to a bottom tab bar on mobile.
 */
export function DashboardSidebar({
  role,
  user,
  items,
  accountItems,
  onLogout,
  defaultCollapsed = false,
  className,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const main = items ?? DASH_NAV[role].main;
  const account = accountItems ?? DASH_NAV[role].account;
  const isActive = useActive(main[0]?.href ?? '');

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-dark-sidebar text-white md:flex',
          collapsed ? 'w-16' : 'w-[244px]',
          className,
        )}
      >
        <div className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')}>
          {collapsed ? (
            <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-sm bg-brand text-white">
              <BrandGlyph />
            </span>
          ) : (
            <Link href={main[0]?.href ?? '/'}>
              <BrandMark onDark />
            </Link>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {main.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
          ))}

          {collapsed ? (
            <div className="my-2 h-px bg-dark-border" />
          ) : (
            <div className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-wider text-white/30">
              Account
            </div>
          )}

          {account.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mx-3 mb-1 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-dark-panel hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-[18px] w-[18px]" />
          ) : (
            <>
              <ChevronsLeft className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>

        <div
          className={cn(
            'flex items-center gap-2.5 border-t border-dark-border p-3.5',
            collapsed && 'justify-center',
          )}
        >
          <Avatar name={user.name} src={user.avatar} size={36} />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white">{user.name}</div>
                <div className="text-[11px] capitalize text-white/50">{user.role ?? role}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-white/50 transition-colors hover:bg-dark-panel hover:text-white"
              >
                <LogOut className="h-[17px] w-[17px]" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hair bg-card md:hidden">
        {main.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-brand' : 'text-muted',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
              {item.badge != null && (
                <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
