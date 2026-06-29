import type { Metadata } from 'next';
import { Heart, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

import { buildMetadata } from '@/lib/seo';
import { PLATFORM_STATS } from '@/lib/marketing-content';
import { Container, Section, SectionHeader, SectionLabel } from '@/components/marketing/section';
import { CtaBand } from '@/components/marketing/cta-band';
import { Prose } from '@/components/marketing/prose';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description:
    'Collably is the local collab marketplace built to make creator and brand partnerships fair, transparent, and effortless, for creators of every size and the businesses around them.',
  path: '/about',
  ogEyebrow: 'About',
});

const VALUES = [
  {
    icon: Sparkles,
    title: 'Access over gatekeeping',
    body: 'Talent and fit beat follower counts. Nano and UGC creators deserve the same shot as anyone.',
  },
  {
    icon: Heart,
    title: 'Real value, stated up front',
    body: 'Every reward and its dollar value is clear before anyone applies. No vague "exposure."',
  },
  {
    icon: ShieldCheck,
    title: 'Trust, verified',
    body: 'Submissions are reviewed and verified, so both sides get exactly what they agreed to.',
  },
  {
    icon: MapPin,
    title: 'Local first',
    body: 'We connect creators with the businesses right in their neighbourhood, starting in Canada.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <header className="relative overflow-hidden bg-dark-sidebar text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(760px 420px at 78% 0%, rgba(24,119,242,0.30), transparent 60%)',
          }}
        />
        <Container size="narrow" className="relative py-20 text-center sm:py-28">
          <SectionLabel onDark className="justify-center">
            About Collably
          </SectionLabel>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.07] tracking-tight sm:text-5xl">
            Making collabs fair, clear, and local.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/70">
            We&apos;re building the marketplace where local businesses and creators of every size
            can work together, without agencies, gatekeeping, or guesswork.
          </p>
        </Container>
      </header>

      {/* Mission */}
      <Section tone="page" containerSize="narrow">
        <Prose>
          <h2>Why we started Collably</h2>
          <p>
            Brilliant local creators kept getting ignored by agencies for not having &quot;enough&quot;
            followers. Meanwhile, small businesses were quoted thousands a month for content that
            didn&apos;t feel authentic. Both sides wanted the same thing, genuine collaborations,
            but there was no fair, transparent place to make them happen.
          </p>
          <p>
            So we built one. On Collably, a business posts a campaign with a clear reward and exactly
            what they need. Creators browse opportunities in their niche and city, apply with a quick
            pitch, and get rewarded for verified work. No middlemen. No follower minimums. No
            &quot;we&apos;ll pay you in exposure.&quot;
          </p>
          <h2>What we believe</h2>
          <p>
            The best content comes from people who actually love a brand, not from whoever has the
            biggest audience. When the value is clear and the process is fair, both sides win, and the
            content is better for it.
          </p>
        </Prose>
      </Section>

      {/* Values */}
      <Section tone="card">
        <SectionHeader label="Our values" title="What guides every decision" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-hair bg-hair sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{v.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Stats */}
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

      <CtaBand
        title="Come build with us"
        subtitle="Whether you create or run a business, there&apos;s a place for you on Collably."
        primary={{ label: 'Get started', href: '/signup' }}
        secondary={{ label: 'Contact us', href: '/contact' }}
      />
    </>
  );
}
