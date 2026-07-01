'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';

/**
 * Route-segment error boundary. Catches render/data errors thrown anywhere below
 * the root layout that don't have a closer `error.tsx` (e.g. marketing, auth,
 * onboarding, public-app). Renders inside `app/layout.tsx`, so the page chrome
 * (html/body/providers) stays intact and `reset()` can recover in place.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to the browser console (and any future error monitoring in P13).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <ErrorState
        onRetry={reset}
        action={
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </main>
  );
}
