import Link from 'next/link';
import { Instagram, Linkedin, Twitter } from 'lucide-react';

import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/shared/brand-mark';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Explore Campaigns', href: '/explore' },
      { label: 'For Businesses', href: '/for-businesses' },
      { label: 'For Creators', href: '/for-creators' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const SOCIALS = [
  { label: 'Instagram', href: '#', icon: Instagram },
  { label: 'Twitter', href: '#', icon: Twitter },
  { label: 'LinkedIn', href: '#', icon: Linkedin },
];

/** Footer: always-dark, 4-column. Brand + tagline + socials, then link columns. */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('bg-dark-sidebar text-white/60', className)}>
      <div className="mx-auto max-w-[1320px] px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <BrandMark onDark />
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed">
              The marketplace where creators earn real rewards and brands get content that converts.
            </p>
            <div className="mt-5 flex gap-2.5">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] text-white/70 transition-colors hover:bg-brand hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-white">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-white/55 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-[13px]">
          <span>© {new Date().getFullYear()} Collably. All rights reserved.</span>
          <span>Toronto · Vancouver · Montreal</span>
        </div>
      </div>
    </footer>
  );
}
