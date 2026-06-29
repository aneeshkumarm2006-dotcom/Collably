import type { BlogPostMeta } from '@/lib/blog/types';

export const meta: BlogPostMeta = {
  slug: 'why-follower-minimums-are-broken',
  title: 'Why follower minimums are broken (and what brands should look at instead)',
  description:
    'Follower counts are a vanity metric that hides your best creators. Here is what actually predicts great collab content, and how to find it.',
  category: 'Creators',
  tags: ['creators', 'ugc', 'strategy'],
  author: { name: 'The Collably Team', role: 'Collably' },
  date: '2026-05-20',
  readingMinutes: 5,
  coverImage:
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=1200&q=80',
  featured: true,
};

export default function Post() {
  return (
    <>
      <p>
        For years, the first question every brand asked a creator was: &quot;How many followers do you
        have?&quot; It&apos;s the wrong question. A follower count tells you how many people clicked
        &quot;follow&quot; at some point, not how many will watch, trust, or act on a recommendation
        today.
      </p>

      <h2>The case against the follower count</h2>
      <p>
        Big accounts often have low engagement, inflated or bought audiences, and followers spread
        across the world who will never walk into your shop. Meanwhile, a nano creator with a few
        thousand engaged, local followers can drive more real visits than someone with 100k.
      </p>
      <p>The follower number hides the three things that actually matter:</p>
      <ul>
        <li>
          <strong>Engagement:</strong> do people comment, save, and share? That&apos;s a signal of
          real attention.
        </li>
        <li>
          <strong>Relevance:</strong> is the audience the people you actually want to reach (right
          niche, right city)?
        </li>
        <li>
          <strong>Craft:</strong> is the content well-shot, on-brand, and genuinely persuasive?
        </li>
      </ul>

      <h2>What to look at instead</h2>
      <p>
        When you evaluate a creator on Collably, skim past the headline number and look at the work.
        A creator&apos;s portfolio, their niche, the content types they specialise in, and the pitch
        they write for your campaign tell you far more than a follower count ever could.
      </p>
      <blockquote>
        The best content comes from people who already love what you do, not from whoever has the
        biggest audience.
      </blockquote>
      <p>
        This is exactly why we built Collably without follower gatekeeping. Campaigns can set a
        minimum if they truly need reach, but many are open to all, including UGC-only creators who
        shoot clean, scroll-stopping product content without any public following at all.
      </p>

      <h2>How to put this into practice</h2>
      <ol>
        <li>Define the outcome you want (footfall, UGC for ads, awareness) before you define an audience size.</li>
        <li>Filter by niche and city first; sort by fit, not followers.</li>
        <li>Read the pitch and the portfolio, then accept the creators whose work matches your brand.</li>
        <li>Verify the deliverables, then build a roster of creators you&apos;ll work with again.</li>
      </ol>

      <p>
        Drop the vanity metric, and a whole tier of talented, motivated creators opens up, usually at
        a fraction of the cost.
      </p>
    </>
  );
}
