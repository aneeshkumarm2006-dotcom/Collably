'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { roleHome } from '@/lib/auth/user';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

/**
 * The landing hero's primary CTA pair. Lives client-side so the landing page can
 * be statically rendered / ISR'd: guests (and the brief pre-hydration window) see
 * the role-choice buttons; a signed-in visitor sees "Go to dashboard".
 */
export function HeroCta() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="bg-white text-brand hover:bg-white/90">
          <Link href={roleHome(user.role)}>
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/explore">Browse campaigns</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button
        asChild
        size="lg"
        className="bg-white text-brand hover:bg-white/90"
        onClick={() => track('cta_get_started', { location: 'hero', audience: 'business' })}
      >
        <Link href="/for-businesses">
          I&apos;m a business <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
        onClick={() => track('cta_get_started', { location: 'hero', audience: 'creator' })}
      >
        <Link href="/for-creators">I&apos;m a creator</Link>
      </Button>
    </div>
  );
}

/**
 * Per-campaign "Sign up to apply" lock bar on the landing live-rail, shown only
 * to signed-out visitors. Client-side so the rail stays in a static page.
 */
export function GuestApplyButton() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isAuthenticated || isLoading) return null;
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="mx-auto"
      onClick={() => track('cta_get_started', { location: 'live_rail', audience: 'creator' })}
    >
      <Link href="/signup">
        <LockIcon /> Sign up to apply
      </Link>
    </Button>
  );
}

function LockIcon() {
  // Inline to keep this client island tiny; matches the lucide Lock used elsewhere.
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
