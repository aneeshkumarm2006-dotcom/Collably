import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Container, Section, SectionHeader, SectionLabel } from '@/components/marketing/section';
import { CtaBand } from '@/components/marketing/cta-band';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { Button } from '@/components/ui/button';

export interface AudiencePageConfig {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Quick trust chips under the hero CTAs. */
  highlights: string[];
  benefitsTitle: string;
  benefitsLabel: string;
  benefits: { icon: LucideIcon; title: string; body: string }[];
  stepsTitle: string;
  stepsLabel: string;
  steps: { title: string; body: string }[];
  faqsTitle?: string;
  faqs: FaqItem[];
  cta: { title: React.ReactNode; subtitle: string; primary: { label: string; href: string } };
}

/**
 * Shared audience landing template (For Creators / For Businesses). One dark
 * hero + benefits grid + numbered steps + FAQ + closing CTA, driven by config so
 * the two pages stay structurally identical and on-brand.
 */
export function AudiencePage({ config }: { config: AudiencePageConfig }) {
  return (
    <>
      {/* Hero */}
      <header className="relative overflow-hidden bg-dark-sidebar text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(820px 460px at 80% 0%, rgba(24,119,242,0.32), transparent 60%)',
          }}
        />
        <Container size="narrow" className="relative py-20 text-center sm:py-28">
          <SectionLabel onDark className="justify-center">
            {config.eyebrow}
          </SectionLabel>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.07] tracking-tight sm:text-5xl">
            {config.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/70">
            {config.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-brand hover:bg-white/90">
              <Link href={config.primaryCta.href}>
                {config.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {config.secondaryCta && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={config.secondaryCta.href}>{config.secondaryCta.label}</Link>
              </Button>
            )}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[13px] text-white/55">
            {config.highlights.map((h, i) => (
              <span key={h} className="flex items-center gap-4">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-white/25" />}
                {h}
              </span>
            ))}
          </div>
        </Container>
      </header>

      {/* Benefits */}
      <Section tone="card">
        <SectionHeader ordinal="01" label={config.benefitsLabel} title={config.benefitsTitle} />
        <div className="grid gap-px overflow-hidden rounded-lg border border-hair bg-hair sm:grid-cols-2">
          {config.benefits.map((b) => (
            <div key={b.title} className="bg-card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                <b.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{b.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Steps */}
      <Section tone="page">
        <SectionHeader ordinal="02" label={config.stepsLabel} title={config.stepsTitle} />
        <div className="grid gap-6 md:grid-cols-3">
          {config.steps.map((step, i) => (
            <div key={step.title} className={cn('rounded-lg border border-hair bg-card p-7')}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand font-mono text-sm font-semibold text-white">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="card">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionLabel ordinal="03" className="mb-4">
              FAQ
            </SectionLabel>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {config.faqsTitle ?? 'Questions, answered'}
            </h2>
          </div>
          <Faq items={config.faqs} />
        </div>
      </Section>

      <CtaBand title={config.cta.title} subtitle={config.cta.subtitle} primary={config.cta.primary} />
    </>
  );
}
