import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { Container, Section, SectionLabel } from '@/components/marketing/section';
import { CtaBand } from '@/components/marketing/cta-band';
import { Faq } from '@/components/marketing/faq';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description:
    'Collably is free to join for creators and businesses. Post campaigns and pay only in the rewards you offer, with no agency retainers. Upgrade to Pro for advanced reach and analytics.',
  path: '/pricing',
  ogEyebrow: 'Pricing',
});

interface Plan {
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  description: string;
  cta: { label: string; href: string };
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Creator',
    audience: 'For creators',
    price: 'Free',
    priceNote: 'forever',
    description: 'Everything you need to find collabs and earn real rewards.',
    cta: { label: 'Join as a creator', href: '/signup' },
    features: [
      'Browse & apply to unlimited campaigns',
      'No follower minimums',
      'Reward & dollar value shown up front',
      'Portfolio that grows with every collab',
      'Direct messaging with brands',
      'In-app + email notifications',
    ],
  },
  {
    name: 'Starter',
    audience: 'For businesses',
    price: 'Free',
    priceNote: 'pay only in rewards',
    description: 'Post campaigns and reward verified work, no retainer required.',
    cta: { label: 'Post a campaign', href: '/signup' },
    featured: true,
    features: [
      'Post campaigns & receive pitches',
      'Review applications & accept creators',
      'Verify submissions end-to-end',
      'Direct messaging with creators',
      'Business profile & active campaign listing',
      'Pay only in the rewards you offer',
    ],
  },
  {
    name: 'Pro',
    audience: 'For growing brands',
    price: 'Custom',
    priceNote: 'talk to us',
    description: 'For brands running campaigns at scale across locations and teams.',
    cta: { label: 'Contact sales', href: '/contact' },
    features: [
      'Everything in Starter',
      'More concurrent active campaigns',
      'Priority placement in Explore',
      'Advanced campaign analytics',
      'Team seats & roles',
      'Priority support',
    ],
  },
];

const PRICING_FAQS = [
  {
    q: 'Is Collably really free?',
    a: 'Yes. Creating an account, building a profile, browsing, applying, and posting campaigns are free. Businesses pay only in the rewards they choose to offer, and there are no platform fees on the Starter plan.',
  },
  {
    q: 'What does "pay only in rewards" mean?',
    a: 'Instead of a cash retainer to an agency, you reward creators with what you already have: products, experiences, vouchers, services, or cash-plus-product. You set the reward and its value, and only reward verified work.',
  },
  {
    q: 'When should I consider Pro?',
    a: 'Pro is for brands running many campaigns at once, across multiple locations or a team, who want priority reach and deeper analytics. Reach out and we’ll tailor a plan to your volume.',
  },
  {
    q: 'Do creators ever pay anything?',
    a: 'No. Collably is, and will remain, free for creators.',
  },
];

export default function PricingPage() {
  return (
    <>
      <Section tone="page">
        <div className="mb-12 text-center">
          <SectionLabel className="justify-center">Pricing</SectionLabel>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, honest pricing
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted">
            Free to join for everyone. Businesses pay only in the rewards they offer, with no agency
            retainers and no platform fees to get started.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-lg border bg-card p-7 shadow-card',
                plan.featured ? 'border-brand ring-1 ring-brand' : 'border-hair',
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {plan.audience}
              </div>
              <h2 className="mt-2 text-2xl font-bold text-ink">{plan.name}</h2>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-ink">{plan.price}</span>
                <span className="text-sm text-muted">{plan.priceNote}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{plan.description}</p>

              <Button
                asChild
                className="mt-6"
                variant={plan.featured ? 'default' : 'outline'}
              >
                <Link href={plan.cta.href}>
                  {plan.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <ul className="mt-7 flex flex-col gap-3 border-t border-hair pt-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-money" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Prices in CAD. Rewards are provided directly by businesses to creators.
        </p>
      </Section>

      <Section tone="card">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionLabel className="mb-4">FAQ</SectionLabel>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Pricing questions
            </h2>
          </div>
          <Container size="default" className="px-0">
            <Faq items={PRICING_FAQS} />
          </Container>
        </div>
      </Section>

      <CtaBand
        title="Start free, today"
        subtitle="Join as a creator or post your first campaign as a business. No card required."
        primary={{ label: 'Get started', href: '/signup' }}
        secondary={{ label: 'Talk to sales', href: '/contact' }}
      />
    </>
  );
}
