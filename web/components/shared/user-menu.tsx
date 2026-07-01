'use client';

import Link from 'next/link';
import { ChevronDown, LayoutDashboard, LogOut, Settings, User as UserIcon } from 'lucide-react';

import type { SessionUser } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Role → dashboard home route. */
export function dashboardHome(role?: string): string {
  if (role === 'creator') return '/dashboard/creator';
  if (role === 'business') return '/dashboard/business';
  return '/';
}

export interface UserMenuProps {
  user: Pick<SessionUser, 'name' | 'email' | 'role' | 'avatar'>;
  onLogout?: () => void;
  className?: string;
}

/** Avatar dropdown: name/email header + dashboard/profile/settings/logout. */
export function UserMenu({ user, onLogout, className }: UserMenuProps) {
  const home = dashboardHome(user.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            'flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-secondary',
            className,
          )}
        >
          <Avatar name={user.name} src={user.avatar} size={34} />
          <ChevronDown className="h-4 w-4 text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="font-semibold text-ink">{user.name}</div>
          {user.email && <div className="truncate text-xs font-normal text-muted">{user.email}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={home}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${home}/profile`}>
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${home}/settings`}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-danger focus:text-danger">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
