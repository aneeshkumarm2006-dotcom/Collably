'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/creators', label: 'Creators' },
  { href: '/businesses', label: 'Businesses' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-hair bg-card p-5">
      <div className="mb-8 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-white">
          C
        </span>
        <span className="text-base font-bold text-ink">Collably Admin</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                active
                  ? 'rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold text-brand'
                  : 'rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-elev'
              }
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="mt-auto rounded-md border border-hair px-3 py-2 text-sm font-semibold text-muted transition hover:text-ink"
      >
        Log out
      </button>
    </aside>
  );
}
