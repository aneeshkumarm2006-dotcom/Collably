import Link from 'next/link';
import type { Metadata } from 'next';
import { Rss } from 'lucide-react';

import { buildMetadata } from '@/lib/seo';
import { getAllPostsMeta, getFeaturedPost } from '@/lib/blog';
import { Container, Section, SectionLabel } from '@/components/marketing/section';
import { PostCard } from '@/components/blog/post-card';

export const metadata: Metadata = buildMetadata({
  title: 'Blog',
  description:
    'Guides, playbooks, and ideas on creator collabs, gifting campaigns, and building a brand with local creators — from the Collably team.',
  path: '/blog',
  ogEyebrow: 'Blog',
});

export default function BlogIndexPage() {
  const featured = getFeaturedPost();
  const posts = getAllPostsMeta();
  const rest = posts.filter((p) => p.slug !== featured.meta.slug);

  return (
    <Section tone="page">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>The Collably Blog</SectionLabel>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Ideas for creators &amp; brands
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-lg text-muted">
            Playbooks and perspectives on running collabs that work — for both sides of the
            marketplace.
          </p>
        </div>
        <Link
          href="/feed.xml"
          className="inline-flex items-center gap-2 rounded-md border border-hair bg-card px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-brand"
        >
          <Rss className="h-4 w-4" /> RSS
        </Link>
      </div>

      {/* Featured */}
      <PostCard post={featured.meta} variant="feature" className="mb-10" />

      {/* Grid */}
      {rest.length > 0 && (
        <Container size="default" className="px-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </Container>
      )}
    </Section>
  );
}
