'use client';

import Link from 'next/link';

import { providerRequiresConsent, writeConsent } from '@/lib/consent';
import { Button } from '@/components/ui/button';
import { useConsent } from './use-consent';

/**
 * A minimal, accessible cookie-consent banner. It only renders when the
 * configured analytics provider actually sets cookies (GA4) AND the visitor
 * hasn't decided yet — cookieless setups (Plausible / analytics off) never show
 * it. Choosing "Accept" loads the analytics script; "Decline" keeps it off.
 */
export function CookieConsent() {
  const consent = useConsent();

  // Nothing to consent to, or already decided.
  if (!providerRequiresConsent() || consent !== 'unset') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-hair bg-card p-4 shadow-card sm:flex-row sm:items-center sm:gap-4">
        <p className="text-sm leading-relaxed text-muted">
          We use cookies for anonymous analytics to improve Collably. See our{' '}
          <Link href="/cookies" className="text-brand underline-offset-2 hover:underline">
            Cookie Policy
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-brand underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => writeConsent('denied')}>
            Decline
          </Button>
          <Button size="sm" onClick={() => writeConsent('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
