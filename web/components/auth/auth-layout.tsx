import Link from 'next/link';

import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/shared/brand-mark';
import { CampaignCard, type CampaignCardData } from '@/components/shared/campaign-card';

/**
 * Shared auth shell: the split-screen brand panel (left, dark) + form panel
 * (right). Used by every `(auth)` page so login / signup / forgot / reset share
 * one branded frame; only the copy (`tagline`, `subtitle`, `proof`) and the form
 * (`children`) change per page.
 *
 * Server component (purely presentational). The brand panel renders decorative
 * floating campaign-card previews + a social-proof row; it collapses below `lg`
 * so the form gets the full width on mobile.
 */

export interface ProofStat {
  value: string;
  label: string;
}

/** Decorative campaign previews that float over the brand panel (guest eye-candy). */
const PREVIEW_CAMPAIGNS: CampaignCardData[] = [
  {
    id: 'preview-maple-oak',
    title: 'Cozy autumn brunch: shoot our new seasonal menu',
    category: 'Food & Beverage',
    business: { name: 'Maple & Oak', city: 'Toronto' },
    reward: { type: 'Product', description: 'Brunch for two, on us', estimatedValue: 120 },
    platform: 'Instagram',
    contentType: 'Reel',
    spotsLeft: 3,
    applicationsCount: 18,
  },
  {
    id: 'preview-bloom-beauty',
    title: 'Glow drop launch: unboxing + first impressions',
    category: 'Beauty',
    business: { name: 'Bloom Beauty', city: 'Vancouver' },
    reward: { type: 'Cash+Product', description: '$250 + full product set', estimatedValue: 250 },
    platform: 'TikTok',
    contentType: 'Video',
    spotsLeft: 5,
    applicationsCount: 41,
  },
];

export interface AuthLayoutProps {
  children: React.ReactNode;
  /** Big headline on the brand panel. */
  tagline: string;
  /** Supporting line under the tagline. */
  subtitle: string;
  /** Social-proof stats shown beneath the subtitle. */
  proof: ProofStat[];
}

export function AuthLayout({ children, tagline, subtitle, proof }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      {/* Brand panel (hidden on small screens) */}
      <aside className="relative hidden overflow-hidden bg-dark-sidebar p-11 text-white lg:flex lg:flex-col">
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Brand-blue radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--brand-primary), transparent 70%)' }}
        />

        <Link href="/" className="relative z-10 w-fit">
          <BrandMark onDark />
        </Link>

        {/* Floating campaign previews */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          <div className="absolute -right-10 top-28 w-[280px] rotate-[3deg] opacity-95 shadow-2xl">
            <CampaignCard campaign={PREVIEW_CAMPAIGNS[0]} />
          </div>
          <div className="absolute right-16 top-[420px] w-[250px] -rotate-2 opacity-95 shadow-2xl">
            <CampaignCard campaign={PREVIEW_CAMPAIGNS[1]} variant="compact" />
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-[380px]">
          <h2 className="text-balance text-[34px] font-semibold leading-tight tracking-tight">
            {tagline}
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-white/60">{subtitle}</p>

          <dl className="mt-8 flex gap-8">
            {proof.map((stat) => (
              <div key={stat.label}>
                <dd className="font-mono text-2xl font-semibold text-money">{stat.value}</dd>
                <dt className="mt-0.5 text-xs tracking-wide text-white/45">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-card px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand (brand panel is hidden < lg) */}
          <Link href="/" className="mb-8 inline-flex lg:hidden">
            <BrandMark />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Small "or" divider between the Google button and the email form. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3.5 text-[13px] text-faint">
      <span className="h-px flex-1 bg-hair" />
      or
      <span className="h-px flex-1 bg-hair" />
    </div>
  );
}

/** Inline error banner shown above the form on submit failure. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'mb-4 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger',
      )}
    >
      {message}
    </div>
  );
}
