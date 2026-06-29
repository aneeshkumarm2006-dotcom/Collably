import type { BlogPostMeta } from '@/lib/blog/types';

export const meta: BlogPostMeta = {
  slug: 'run-your-first-gifting-campaign',
  title: 'How to run your first gifting campaign (a step-by-step guide for local brands)',
  description:
    'A practical playbook for businesses: how to structure a gifting campaign that attracts the right creators and gets you authentic content worth sharing.',
  category: 'Businesses',
  tags: ['businesses', 'campaigns', 'guide'],
  author: { name: 'The Collably Team', role: 'Collably' },
  date: '2026-06-04',
  readingMinutes: 6,
  coverImage:
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
  featured: false,
};

export default function Post() {
  return (
    <>
      <p>
        A gifting campaign is the simplest way to get authentic, creator-made content without an
        agency retainer: you offer a reward — a product, an experience, a voucher — and creators apply
        to collaborate. Done well, you get content that converts and a roster of creators who genuinely
        like your brand. Here&apos;s how to run your first one.
      </p>

      <h2>1. Start with the outcome</h2>
      <p>
        Before you write a word, decide what success looks like. More footfall this month? A library of
        UGC for your ads? Awareness for a new launch? Your goal shapes everything — the reward, the
        deliverables, and which creators you accept.
      </p>

      <h2>2. Pick a reward worth applying for</h2>
      <p>
        The strongest campaigns make the value obvious and generous relative to the ask. State the
        reward and its dollar value up front. A tasting menu for two, a full product set, a
        three-month membership — concrete and clearly worth a creator&apos;s time.
      </p>
      <blockquote>
        If you wouldn&apos;t apply for it yourself, it&apos;s probably not compelling enough.
      </blockquote>

      <h2>3. Be specific about deliverables</h2>
      <p>Vague briefs get vague content. Spell out exactly what you need:</p>
      <ul>
        <li>Platform and format (e.g. 1 Instagram Reel + 2 Stories);</li>
        <li>Must-haves — tag your handle, use a hashtag, feature a specific product;</li>
        <li>A realistic deadline so creators can plan their shoot.</li>
      </ul>
      <p>
        Leave room for creativity within those guardrails — creators know their audience better than
        anyone, and the content performs best when it sounds like them.
      </p>

      <h2>4. Review pitches like a casting call</h2>
      <p>
        When applications come in, look past the follower count. Read the pitch, open the portfolio,
        and check the niche and city fit. Accept the creators whose work matches your brand and whose
        pitch shows they understand it.
      </p>

      <h2>5. Verify, then build relationships</h2>
      <p>
        Once a creator posts, they submit the live link and a proof screenshot. Review it, verify it,
        and complete the collab. The creators who delivered well? Invite them back. A small, reliable
        roster beats a constant cold search.
      </p>

      <h2>A simple first-campaign template</h2>
      <ol>
        <li><strong>Reward:</strong> your hero product or signature experience, value stated.</li>
        <li><strong>Deliverables:</strong> 1 Reel + 2 Stories, tag + hashtag, 7-day deadline.</li>
        <li><strong>Open to:</strong> all creators (or a modest minimum if you need reach).</li>
        <li><strong>Goal:</strong> 3–5 pieces of UGC you can reshare and run as ads.</li>
      </ol>

      <p>
        Keep it focused, make the value clear, and let creators do what they do best. Your first
        campaign doesn&apos;t need to be perfect — it needs to be live.
      </p>
    </>
  );
}
