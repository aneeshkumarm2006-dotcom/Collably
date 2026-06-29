import Link from 'next/link';

import { BrandMark } from '@/components/shared/brand-mark';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Page not found',
};

/**
 * Root 404. Rendered inside `app/layout.tsx` for any unmatched route (and any
 * `notFound()` call without a closer `not-found.tsx`). Kept self-contained — no
 * navbar — with a clear path back into the product.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8" aria-label="Collably home">
        <BrandMark />
      </Link>
      <p className="font-mono text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-muted">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">Explore campaigns</Link>
        </Button>
      </div>
    </main>
  );
}
