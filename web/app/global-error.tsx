'use client';

import { useEffect } from 'react';

import './globals.css';

/**
 * Global error boundary: the last line of defence. Catches errors thrown in the
 * root layout itself (where `app/error.tsx` cannot reach), so it must render its
 * own `<html>`/`<body>`. Intentionally dependency-free (no providers/theme) so it
 * works even when the app shell is the thing that failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            The page failed to load. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-secondary"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
