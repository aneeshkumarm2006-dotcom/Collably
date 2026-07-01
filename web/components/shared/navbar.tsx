'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { track } from '@/lib/analytics';
import { BrandMark } from '@/components/shared/brand-mark';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserMenu } from '@/components/shared/user-menu';

const LINKS = [
  { label: 'Explore', href: '/explore' },
  { label: 'For Creators', href: '/for-creators' },
  { label: 'For Businesses', href: '/for-businesses' },
  { label: 'Pricing', href: '/pricing' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Public, auth-aware navbar. Signed out → Log in / Get started; signed in →
 * notification bell + avatar menu. `onDark` tints it for the landing hero.
 */
export function Navbar({ onDark }: { onDark?: boolean }) {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 h-16 border-b backdrop-blur-md',
        onDark ? 'border-dark-border bg-dark-sidebar/85' : 'border-hair bg-page/85',
      )}
    >
      <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Collably home">
            <BrandMark onDark={onDark} />
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive(pathname, l.href)
                    ? 'text-brand'
                    : onDark
                      ? 'text-white/70 hover:text-white'
                      : 'text-muted hover:text-ink',
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell notifications={[]} />
              <UserMenu user={user} onLogout={logout} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login" onClick={() => track('cta_login', { location: 'navbar' })}>
                  Log in
                </Link>
              </Button>
              <Button asChild>
                <Link
                  href="/signup"
                  onClick={() => track('cta_get_started', { location: 'navbar' })}
                >
                  Get started
                </Link>
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-secondary hover:text-ink md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader className="px-0 pt-0">
                <SheetTitle>
                  <BrandMark />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        'rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary',
                        isActive(pathname, l.href) ? 'text-brand' : 'text-ink',
                      )}
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
              {!user && (
                <div className="mt-4 flex flex-col gap-2 border-t border-hair pt-4">
                  <SheetClose asChild>
                    <Button asChild variant="outline">
                      <Link href="/login" onClick={() => track('cta_login', { location: 'mobile_menu' })}>
                        Log in
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link
                        href="/signup"
                        onClick={() => track('cta_get_started', { location: 'mobile_menu' })}
                      >
                        Get started
                      </Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
