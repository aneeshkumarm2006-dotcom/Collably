import { Apple, Bell, Play, Smartphone } from 'lucide-react';

import { Container } from '@/components/marketing/section';
import { SectionLabel } from '@/components/marketing/section';

const APP_PERKS = [
  'Apply to collabs in a tap',
  'Live chat with brands',
  'Push alerts for new local campaigns',
] as const;

/**
 * "Get the app" promo band: announces the upcoming iOS + Android apps as
 * coming soon. Store badges are intentionally non-interactive (no links yet).
 */
export function AppPromo() {
  return (
    <section className="relative overflow-hidden bg-dark-sidebar py-16 text-white sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 420px at 88% 12%, rgba(24,119,242,0.28), transparent 60%)',
        }}
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <SectionLabel ordinal="07" onDark className="mb-5">
              Collably mobile
            </SectionLabel>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              The Collably app is{' '}
              <span className="text-brand-secondary">coming soon.</span>
            </h2>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-white/70">
              We&apos;re putting the finishing touches on the iOS and Android apps, so you can
              browse rewards, pitch brands, and manage every collab right from your pocket.
            </p>

            <ul className="mt-7 flex flex-col gap-3">
              {APP_PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-[15px] text-white/80">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft/15 text-brand-secondary">
                    <Smartphone className="h-3.5 w-3.5" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <StoreBadge icon={Apple} caption="Coming soon to the" store="App Store" />
              <StoreBadge icon={Play} caption="Coming soon to" store="Google Play" />
            </div>
          </div>

          {/* Notify card */}
          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft/15 text-brand-secondary">
              <Bell className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold tracking-tight">Be first in line</h3>
            <p className="text-sm leading-relaxed text-white/65">
              Create a free account today and use Collably on the web now. You&apos;ll be the first
              to know the moment the app lands in the stores.
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-money/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-money">
              <span className="h-1.5 w-1.5 rounded-full bg-money" /> In development
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A disabled app-store badge (no store links yet — apps are pre-launch). */
function StoreBadge({
  icon: Icon,
  caption,
  store,
}: {
  icon: React.ComponentType<{ className?: string }>;
  caption: string;
  store: string;
}) {
  return (
    <div
      aria-disabled
      className="inline-flex cursor-default items-center gap-3 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 opacity-80"
    >
      <Icon className="h-6 w-6 text-white/80" />
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
          {caption}
        </span>
        <span className="text-[15px] font-semibold text-white">{store}</span>
      </span>
    </div>
  );
}
