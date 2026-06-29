import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Gift,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';

import { publicApi } from '@/lib/api/public';
import { toCampaignCardData } from '@/lib/campaign-card';
import type { PublicCampaign } from '@/lib/api/types';
import {
  buildMetadata,
  organizationJsonLd,
  websiteJsonLd,
  SITE_DESCRIPTION,
} from '@/lib/seo';
import {
  CATEGORY_STRIP,
  FEATURES,
  GENERAL_FAQS,
  HOW_IT_WORKS,
  PLATFORM_STATS,
  SAMPLE_REWARDS,
  TESTIMONIALS,
} from '@/lib/marketing-content';
import { Container, Section, SectionHeader, SectionLabel } from '@/components/marketing/section';
import { CtaBand } from '@/components/marketing/cta-band';
import { Faq, faqPageJsonLd } from '@/components/marketing/faq';
import { CampaignCard } from '@/components/shared/campaign-card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/avatar';
import { JsonLd } from '@/components/shared/json-ld';
import { HeroCta, GuestApplyButton } from '@/components/marketing/hero-cta';
import { AppPromo } from '@/components/marketing/app-promo';

export const metadata: Metadata = buildMetadata({
  description: SITE_DESCRIPTION,
  path: '/',
});

const FEATURE_ICONS = { users: Users, gift: Gift, 'badge-check': BadgeCheck, 'map-pin': MapPin };

// Statically rendered + revalidated; the live rail refreshes in the background.
export const revalidate = 300;

/** Pull a handful of active campaigns for the hero + live rail (graceful on error). */
async function getLiveCampaigns(): Promise<PublicCampaign[]> {
  try {
    const res = await publicApi.campaigns.list({ status: 'Active', sort: 'newest', limit: 8 });
    return res.data;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const campaigns = await getLiveCampaigns();
  const heroCampaigns = campaigns.slice(0, 2);
  const liveCampaigns = campaigns.slice(0, 3);

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), faqPageJsonLd(GENERAL_FAQS)]} />

      {/* ===== Hero ===== */}
      <header className="relative overflow-hidden bg-dark-sidebar text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 520px at 82% 8%, rgba(24,119,242,0.32), transparent 60%)',
          }}
        />
        <Container className="relative py-16 sm:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <SectionLabel onDark>The local collab marketplace</SectionLabel>
              <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Real perks from real local spots, for the creators who{' '}
                <span className="text-brand-secondary">show up.</span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/70">
                The marketplace where creators earn real rewards and brands get content that actually
                converts, with no agencies and no follower gatekeeping.
              </p>
              <HeroCta />
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] text-white/55">
                <span>Free to join</span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>No follower minimums</span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>
                  <b className="font-semibold text-money">8,500+</b> creators
                </span>
              </div>
            </div>

            {/* Live offers stack */}
            {heroCampaigns.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.14em] text-white/55">
                  <span>Live offers near you</span>
                  <span className="inline-flex items-center gap-2 text-money">
                    <span className="h-1.5 w-1.5 rounded-full bg-money" /> Open now
                  </span>
                </div>
                {heroCampaigns.map((c) => (
                  <CampaignCard key={c._id} campaign={toCampaignCardData(c)} />
                ))}
              </div>
            )}
          </div>
        </Container>
      </header>

      {/* ===== Categories strip ===== */}
      <div className="border-b border-hair bg-card">
        <Container className="flex flex-wrap items-center gap-x-1 gap-y-2 py-5">
          {CATEGORY_STRIP.map((cat, i) => (
            <Link
              key={cat.label}
              href={`/explore?category=${encodeURIComponent(cat.label)}`}
              className={`inline-flex items-baseline gap-2 px-5 py-1 text-[15px] font-medium text-ink transition-colors hover:text-brand ${
                i !== CATEGORY_STRIP.length - 1 ? 'border-r border-hair' : ''
              }`}
            >
              {cat.label}
              <span className="font-mono text-xs text-money">{cat.count}</span>
            </Link>
          ))}
        </Container>
      </div>

      {/* ===== How it works ===== */}
      <Section tone="page" id="how">
        <SectionHeader
          ordinal="01"
          label="How it works"
          title="Two sides, one simple flow"
          aside="Post, pitch, verify. The whole collab lives in one place, from first hello to verified post."
          split
        />
        <div className="grid gap-10 md:grid-cols-2 md:gap-0">
          <HowColumn heading="For businesses" steps={HOW_IT_WORKS.business} accent />
          <HowColumn
            heading="For creators"
            steps={HOW_IT_WORKS.creator}
            className="md:border-l md:border-hair md:pl-14"
          />
        </div>
      </Section>

      {/* ===== Features ===== */}
      <Section tone="card">
        <SectionHeader ordinal="02" label="Why Collably" title="Built to make collabs effortless" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feat, i) => {
            const Icon = FEATURE_ICONS[feat.icon as keyof typeof FEATURE_ICONS] ?? Gift;
            return (
              <div key={feat.title} className="bg-card p-7">
                <span className="font-mono text-xs text-money">/{String(i + 1).padStart(2, '0')}</span>
                <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feat.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ===== Rewards ===== */}
      <Section tone="page">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionLabel ordinal="03" className="mb-4">
              Real rewards
            </SectionLabel>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Get paid in experiences you&apos;ll actually love
            </h2>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted">
              No vague &quot;exposure.&quot; Every campaign spells out exactly what you earn, from
              tasting menus to skincare sets to studio memberships, with the dollar value up front.
            </p>
            <Button asChild className="mt-7">
              <Link href="/explore">
                Browse rewards <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="border-t border-hair">
            {SAMPLE_REWARDS.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between gap-4 border-b border-hair py-4"
              >
                <div>
                  <div className="text-[15px] font-medium text-ink">{r.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">
                    {r.category}
                  </div>
                </div>
                <div
                  className={`font-mono text-base font-semibold ${
                    r.value === '—' ? 'text-faint' : 'text-money'
                  }`}
                >
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== Live campaigns ===== */}
      {liveCampaigns.length > 0 && (
        <Section tone="card">
          <SectionHeader
            ordinal="04"
            label="Live right now"
            title="Active campaigns"
            cta={
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 border-b border-brand pb-1 font-mono text-[13px] text-brand transition-all hover:gap-3"
              >
                See all campaigns <ArrowRight className="h-[15px] w-[15px]" />
              </Link>
            }
            split
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liveCampaigns.map((c) => (
              <div key={c._id} className="flex flex-col gap-4">
                <CampaignCard campaign={toCampaignCardData(c)} />
                <GuestApplyButton />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ===== Testimonials ===== */}
      <Section tone="page">
        <SectionHeader ordinal="05" label="Loved by both sides" title="What our community says" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-hair bg-hair md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col bg-card p-7">
              <div className="mb-4 flex gap-1 text-warn">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-ink">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar name={t.name} size={40} />
                <div className="text-sm">
                  <div className="font-semibold text-ink">{t.name}</div>
                  <div className="font-mono text-[11px] text-muted">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ===== Stats band ===== */}
      <section className="bg-brand py-16 text-white sm:py-20">
        <Container>
          <div className="grid gap-10 sm:grid-cols-3">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-5xl font-bold tracking-tight sm:text-6xl">
                  {stat.value}
                </div>
                <div className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-white/70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ===== FAQ ===== */}
      <Section tone="page">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionLabel ordinal="06" className="mb-4">
              FAQ
            </SectionLabel>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
          </div>
          <Faq items={GENERAL_FAQS} />
        </div>
      </Section>

      {/* ===== App (coming soon) ===== */}
      <AppPromo />

      {/* ===== Final CTA ===== */}
      <CtaBand
        eyebrow="Free to join"
        title={
          <>
            Ready to start your <span className="italic">first collab?</span>
          </>
        }
        subtitle="Join thousands of Canadian creators and brands already making collabs happen on Collably."
      />
    </>
  );
}

function HowColumn({
  heading,
  steps,
  accent,
  className,
}: {
  heading: string;
  steps: readonly { title: string; body: string }[];
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3
        className={`mb-2 flex items-center gap-3 font-mono text-[13px] font-medium uppercase tracking-[0.14em] ${
          accent ? 'text-brand' : 'text-ink'
        }`}
      >
        {heading}
        <span className="h-px flex-1 bg-hair" />
      </h3>
      {steps.map((step, i) => (
        <div key={step.title} className="grid grid-cols-[44px_1fr] gap-x-4 border-t border-hair py-7 first:border-t-0">
          <span
            className={`pt-1 font-mono text-sm font-medium ${accent ? 'text-brand' : 'text-muted'}`}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <h4 className="text-xl font-bold tracking-tight text-ink">{step.title}</h4>
          <p className="col-start-2 mt-1 text-[15px] leading-relaxed text-muted">{step.body}</p>
        </div>
      ))}
    </div>
  );
}
