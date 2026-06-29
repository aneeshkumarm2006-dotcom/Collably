import type { ComponentType } from 'react';

/**
 * Blog post metadata. Each post is a `.tsx` module under `content/blog/` that
 * exports `meta` (this shape) + a default React component for the body. The
 * registry in `lib/blog/index.ts` collects them — a lightweight, type-safe
 * content collection with no MDX toolchain.
 */
export interface BlogPostMeta {
  slug: string;
  title: string;
  /** Excerpt + meta description + RSS summary (one sentence or two). */
  description: string;
  /** Editorial category (one per post) — used for the index filter + breadcrumbs. */
  category: string;
  tags: string[];
  author: { name: string; role?: string };
  /** ISO date published. */
  date: string;
  /** ISO date last updated (defaults to `date`). */
  updated?: string;
  readingMinutes: number;
  /** Remote cover image (Unsplash/Pixabay/Cloudinary) — hero + social preview. */
  coverImage?: string;
  /** Surface on the index hero. */
  featured?: boolean;
}

export interface BlogPost {
  meta: BlogPostMeta;
  Body: ComponentType;
}
