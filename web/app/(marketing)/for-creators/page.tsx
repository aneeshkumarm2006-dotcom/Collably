import type { Metadata } from 'next';
import { Gift, MapPin, Sparkles, TrendingUp } from 'lucide-react';

import { buildMetadata } from '@/lib/seo';
import { AudiencePage, type AudiencePageConfig } from '@/components/marketing/audience-page';

export const metadata: Metadata = buildMetadata({
  title: 'For Creators',
  description:
    'Earn real rewards from local brands — no follower minimums, no agency gatekeeping. Browse campaigns in your niche, apply with a pitch, and get rewarded for content you love making.',
  path: '/for-creators',
  ogEyebrow: 'For Creators',
  keywords: ['creator collabs', 'UGC creator', 'brand gifting', 'nano influencer', 'creator rewards'],
});

const config: AudiencePageConfig = {
  eyebrow: 'For Creators',
  title: (
    <>
      Real rewards for the content you <span className="text-brand-secondary">already love making.</span>
    </>
  ),
  subtitle:
    'Collab with local brands in your niche, get rewarded with products, experiences and cash — and build a portfolio that grows with you. No follower minimums, ever.',
  primaryCta: { label: 'Join as a creator', href: '/signup' },
  secondaryCta: { label: 'Browse campaigns', href: '/explore' },
  highlights: ['Free to join', 'No follower minimums', 'UGC creators welcome'],
  benefitsLabel: 'Why creators choose Collably',
  benefitsTitle: 'Built for creators at every size',
  benefits: [
    {
      icon: Sparkles,
      title: 'No follower gatekeeping',
      body: 'Nano and UGC-only creators are first-class here. Brands match on content fit and quality — not vanity metrics.',
    },
    {
      icon: Gift,
      title: 'Rewards, never "exposure"',
      body: 'Every campaign states the reward and its dollar value before you apply. No chasing, no surprises.',
    },
    {
      icon: MapPin,
      title: 'Collabs in your city',
      body: 'Discover campaigns by niche and neighbourhood, so you work with brands right around the corner.',
    },
    {
      icon: TrendingUp,
      title: 'Build your portfolio',
      body: 'Every verified collab adds to your profile and track record, making the next one easier to land.',
    },
  ],
  stepsLabel: 'How it works',
  stepsTitle: 'From browsing to rewarded in three steps',
  steps: [
    { title: 'Browse your niche', body: 'Find campaigns from brands matching your niche and your city.' },
    { title: 'Apply with a pitch', body: 'No agency gatekeeping — just you, your work, and a quick pitch.' },
    { title: 'Collab & earn', body: 'Complete the collab, get verified, and the reward is yours.' },
  ],
  faqs: [
    {
      q: 'Do I really not need a minimum follower count?',
      a: 'Correct. Many campaigns are open to all, and UGC-only creators (who produce content without a public following) are welcome. Each brand sets its own requirements, and you only see campaigns you can apply to.',
    },
    {
      q: 'How do I get paid?',
      a: 'Rewards vary by campaign — free products, dining experiences, vouchers, services, memberships, or cash-plus-product. Once the brand verifies your submission, the collab is marked complete and the reward is yours.',
    },
    {
      q: 'What do I submit after a collab?',
      a: 'You add the live post link and a proof screenshot for each deliverable, plus an optional note. The brand reviews it and marks it verified, requests a revision, or flags an issue.',
    },
    {
      q: 'Is it free for creators?',
      a: 'Yes — joining, building your profile, browsing campaigns, and applying are all completely free.',
    },
  ],
  cta: {
    title: (
      <>
        Your next collab is <span className="italic">waiting.</span>
      </>
    ),
    subtitle: 'Create your free creator profile and start applying to campaigns in your niche today.',
    primary: { label: 'Join as a creator', href: '/signup' },
  },
};

export default function ForCreatorsPage() {
  return <AudiencePage config={config} />;
}
