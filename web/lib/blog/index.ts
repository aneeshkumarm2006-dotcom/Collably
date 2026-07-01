/**
 * Blog content registry. Each post is a `.tsx` module under `content/blog/` that
 * exports `meta` + a default body component; we collect them here, sorted newest
 * first. Adding a post = create the file and add it to `POSTS`.
 *
 * This is a deliberately lightweight, type-safe content collection (no MDX
 * toolchain). The page renders `<post.Body />` inside the shared `Prose` wrapper.
 */
import type { BlogPost } from './types';

import Article1, { meta as meta1 } from '@/content/blog/why-follower-minimums-are-broken';
import Article2, { meta as meta2 } from '@/content/blog/run-your-first-gifting-campaign';

const POSTS: BlogPost[] = [
  { meta: meta1, Body: Article1 },
  { meta: meta2, Body: Article2 },
].sort((a, b) => +new Date(b.meta.date) - +new Date(a.meta.date));

/** All posts, newest first. */
export function getAllPosts(): BlogPost[] {
  return POSTS;
}

/** Just the metadata (for the index list / sitemap / RSS), newest first. */
export function getAllPostsMeta() {
  return POSTS.map((p) => p.meta);
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.meta.slug === slug);
}

/** The featured post (or the most recent) for the index hero. */
export function getFeaturedPost(): BlogPost {
  return POSTS.find((p) => p.meta.featured) ?? POSTS[0];
}

/** Distinct categories present across all posts. */
export function getAllCategories(): string[] {
  return Array.from(new Set(POSTS.map((p) => p.meta.category)));
}

/** Up to `limit` other posts (excludes `slug`), preferring the same category. */
export function getRelatedPosts(slug: string, limit = 2): BlogPost[] {
  const current = getPost(slug);
  const others = POSTS.filter((p) => p.meta.slug !== slug);
  if (!current) return others.slice(0, limit);
  const sameCat = others.filter((p) => p.meta.category === current.meta.category);
  const rest = others.filter((p) => p.meta.category !== current.meta.category);
  return [...sameCat, ...rest].slice(0, limit);
}
