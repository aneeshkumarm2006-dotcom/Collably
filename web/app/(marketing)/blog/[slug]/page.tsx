import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';

import { buildMetadata, blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { getAllPostsMeta, getPost, getRelatedPosts } from '@/lib/blog';
import { Container } from '@/components/marketing/section';
import { Prose } from '@/components/marketing/prose';
import { CtaBand } from '@/components/marketing/cta-band';
import { PostCard } from '@/components/blog/post-card';
import { Avatar } from '@/components/shared/avatar';
import { JsonLd } from '@/components/shared/json-ld';

/** Pre-render every post at build time. */
export function generateStaticParams() {
  return getAllPostsMeta().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return buildMetadata({ title: 'Post not found', description: '', path: `/blog/${slug}`, noIndex: true });
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.description,
    path: `/blog/${post.meta.slug}`,
    image: post.meta.coverImage,
    type: 'article',
    ogEyebrow: `Blog · ${post.meta.category}`,
    keywords: post.meta.tags,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { meta, Body } = post;
  const related = getRelatedPosts(slug);

  return (
    <article className="bg-page pb-4">
      <JsonLd
        data={[
          blogPostingJsonLd({
            slug: meta.slug,
            title: meta.title,
            description: meta.description,
            image: meta.coverImage,
            datePublished: meta.date,
            dateModified: meta.updated,
            authorName: meta.author.name,
          }),
          breadcrumbJsonLd([
            { name: 'Blog', path: '/blog' },
            { name: meta.title, path: `/blog/${meta.slug}` },
          ]),
        ]}
      />

      <Container size="narrow" className="pt-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-brand">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-faint" />
          <span className="text-brand">{meta.category}</span>
        </nav>

        {/* Header */}
        <header className="mt-5">
          <h1 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted">{meta.description}</p>
          <div className="mt-6 flex items-center gap-3">
            <Avatar name={meta.author.name} size={40} />
            <div className="text-sm">
              <div className="font-semibold text-ink">{meta.author.name}</div>
              <div className="font-mono text-[12px] text-muted">
                {formatDate(meta.date)} · {meta.readingMinutes} min read
              </div>
            </div>
          </div>
        </header>
      </Container>

      {/* Cover */}
      {meta.coverImage && (
        <Container size="narrow" className="mt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-secondary">
            <Image
              src={meta.coverImage}
              alt={meta.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 760px"
              className="object-cover"
            />
          </div>
        </Container>
      )}

      {/* Body */}
      <Container size="narrow" className="mt-10">
        <Prose>
          <Body />
        </Prose>

        {/* Tags */}
        {meta.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-hair pt-6">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hair bg-card px-3 py-1 font-mono text-[12px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Container>

      {/* Related */}
      {related.length > 0 && (
        <Container size="default" className="mt-16">
          <h2 className="mb-6 text-xl font-bold text-ink">Keep reading</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((r) => (
              <PostCard key={r.meta.slug} post={r.meta} />
            ))}
          </div>
        </Container>
      )}

      <div className="mt-16">
        <CtaBand
          title="Ready to start a collab?"
          subtitle="Join Collably free, as a creator or a business, and put these ideas to work."
          primary={{ label: 'Get started', href: '/signup' }}
          secondary={{ label: 'Browse campaigns', href: '/explore' }}
        />
      </div>
    </article>
  );
}
