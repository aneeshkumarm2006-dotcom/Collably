'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Full-width horizontal admin top nav: brand mark, primary section links,
 * a search field, and an avatar that doubles as the log-out control. Replaces
 * the old left sidebar so the console content can span the full page width.
 */

type NavItem = { label: string; href?: string; icon: ReactNode };

const NAV: NavItem[] = [
  {
    label: 'Creators',
    href: '/creators',
    icon: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M22 21v-2a4 4 0 0 0-3-3.87" />
    ),
  },
  {
    label: 'Businesses',
    href: '/businesses',
    icon: <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />,
  },
  {
    label: 'Reports',
    icon: <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01" />,
  },
  {
    label: 'Messages',
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="flex h-[62px] items-center gap-5 border-b border-hair bg-card px-4 md:px-8">
      <div className="flex shrink-0 items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(150deg,#2D88FF,#1877F2)] text-white shadow-[0_4px_12px_rgba(24,119,242,0.35)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
            <path
              d="M12 2C8.1 2 5 5.1 5 9c0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7Z"
              fill="currentColor"
              opacity=".9"
            />
            <circle cx="12" cy="9" r="2.4" fill="#1877F2" />
          </svg>
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-extrabold tracking-tight text-ink">
            Local Creator Crew
          </span>
          <span className="block text-[10.5px] font-semibold text-faint">Admin console</span>
        </span>
      </div>

      <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
        {NAV.map((n) => {
          const active = n.href ? pathname.startsWith(n.href) : false;
          const glyph = (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 opacity-85"
            >
              {n.icon}
            </svg>
          );
          const base =
            'flex items-center gap-2 rounded-[9px] px-3 py-2 text-[13.5px] font-bold transition';
          if (!n.href) {
            return (
              <span
                key={n.label}
                aria-disabled="true"
                title="Coming soon"
                className={`${base} cursor-default text-faint`}
              >
                {glyph}
                {n.label}
              </span>
            );
          }
          return (
            <Link
              key={n.label}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={`${base} ${
                active
                  ? 'bg-brand-soft text-brand-deep'
                  : 'text-muted hover:bg-elev hover:text-ink'
              }`}
            >
              {glyph}
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden items-center sm:flex">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 h-[15px] w-[15px] text-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            aria-label="Search creators"
            placeholder="Search creators"
            className="w-[200px] rounded-[10px] border border-hair bg-elev py-2 pl-8 pr-3 text-[13.5px] text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
        </div>
        <button
          type="button"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className="grid h-9 w-9 place-items-center rounded-full border border-hair bg-elev text-[12.5px] font-extrabold text-muted transition hover:border-faint hover:text-ink"
        >
          A
        </button>
      </div>
    </header>
  );
}
