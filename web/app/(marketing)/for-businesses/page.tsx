import type { Metadata } from 'next';
import { BadgeCheck, Megaphone, Users, Wallet } from 'lucide-react';

import { buildMetadata } from '@/lib/seo';
import { AudiencePage, type AudiencePageConfig } from '@/components/marketing/audience-page';

export const metadata: Metadata = buildMetadata({
  title: 'For Businesses',
  description:
    'Run gifting campaigns and get authentic UGC from local creators — without agency retainers. Post a campaign, review real pitches, accept the creators you love, and verify the content.',
  path: '/for-businesses',
  ogEyebrow: 'For Businesses',
  keywords: ['UGC for brands', 'influencer marketing', 'creator campaigns', 'brand gifting', 'local marketing'],
});

const config: AudiencePageConfig = {
  eyebrow: 'For Businesses',
  title: (
    <>
      Authentic creator content, <span className="text-brand-secondary">without the agency bill.</span>
    </>
  ),
  subtitle:
    'Post a campaign, review pitches from creators who genuinely want to work with you, and pay in rewards you already have. Real UGC, verified end-to-end — no monthly retainers.',
  primaryCta: { label: 'Post a campaign', href: '/signup' },
  secondaryCta: { label: 'See pricing', href: '/pricing' },
  highlights: ['Free to post', 'No agency retainers', 'Verified submissions'],
  benefitsLabel: 'Why brands choose Collably',
  benefitsTitle: 'Marketing that pays for itself',
  benefits: [
    {
      icon: Wallet,
      title: 'Pay in rewards, not retainers',
      body: 'Offer products, experiences or vouchers instead of cash agencies. You set the reward and its value — and only reward verified work.',
    },
    {
      icon: Users,
      title: 'Real pitches from real creators',
      body: 'Browse profiles and pitches from creators who actually want to collab with your brand, then pick the ones you love.',
    },
    {
      icon: BadgeCheck,
      title: 'Verified end-to-end',
      body: 'Creators submit live links and proof. You review and verify each submission before the collab completes — so you get what you paid for.',
    },
    {
      icon: Megaphone,
      title: 'Reach the right local audience',
      body: 'Campaigns surface to creators by niche and city, so your content lands with the audience that matters most.',
    },
  ],
  stepsLabel: 'How it works',
  stepsTitle: 'Launch a campaign in three steps',
  steps: [
    { title: 'Post a campaign', body: "Tell creators what you're offering and what you need — in minutes." },
    { title: 'Review & accept', body: 'Browse pitches and profiles, then accept the creators that fit your brand.' },
    { title: 'Verify the content', body: 'Review submissions, verify the post, and complete the collab — UGC without agency costs.' },
  ],
  faqs: [
    {
      q: 'How much does it cost to post a campaign?',
      a: 'Posting campaigns and reviewing applications is free. You only ever provide the reward you advertise — a product, experience, voucher, service, or cash-plus-product — and only after you verify the creator’s work.',
    },
    {
      q: 'How do I know the content actually went live?',
      a: 'Creators submit the live post link plus a proof screenshot for every deliverable. You review each submission and can verify it, request a revision, or flag an issue before marking the collab complete.',
    },
    {
      q: 'Can I work with smaller, local creators?',
      a: 'Absolutely — that’s the point. You can set a minimum follower count or open a campaign to all, including UGC-only creators who shoot clean content without a public following.',
    },
    {
      q: 'How is this different from an agency?',
      a: 'No monthly retainer, no middleman. You post directly, talk to creators directly, and reward verified work — typically at a fraction of agency cost.',
    },
  ],
  cta: {
    title: (
      <>
        Post your first campaign <span className="italic">today.</span>
      </>
    ),
    subtitle: 'Create a free business account and start receiving pitches from local creators within days.',
    primary: { label: 'Get started — it’s free', href: '/signup' },
  },
};

export default function ForBusinessesPage() {
  return <AudiencePage config={config} />;
}
