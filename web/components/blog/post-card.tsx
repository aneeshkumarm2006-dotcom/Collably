import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { BlogPostMeta } from '@/lib/blog/types';

/** A blog post card for the index grid (`default`) or the featured hero (`feature`). */
export function PostCard({
  post,
  variant = 'default',
  className,
}: {
  post: BlogPostMeta;
  variant?: 'default' | 'feature';
  className?: string;
}) {
  const feature = variant === 'feature';

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group flex overflow-hidden rounded-lg border border-hair bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover',
        feature ? 'flex-col md:flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-secondary',
          feature ? 'aspect-[16/10] md:aspect-auto md:w-1/2' : 'aspect-[16/9] w-full',
        )}
      >
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes={feature ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className={cn('flex flex-1 flex-col p-6', feature && 'md:p-8 lg:justify-center')}>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          <span className="text-brand">{post.category}</span>
          <span className="h-1 w-1 rounded-full bg-hair-strong" />
          <span>{post.readingMinutes} min read</span>
        </div>
        <h3
          className={cn(
            'mt-3 font-bold tracking-tight text-ink',
            feature ? 'text-2xl sm:text-3xl' : 'line-clamp-2 text-lg',
          )}
        >
          {post.title}
        </h3>
        <p className={cn('mt-2 text-sm leading-relaxed text-muted', feature ? 'line-clamp-3' : 'line-clamp-2')}>
          {post.description}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[13px] text-faint">{formatDate(post.date)}</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
