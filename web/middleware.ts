/**
 * Edge middleware: the first, cheap auth gate for the authed route groups.
 *
 * It only checks for the *presence* of a session cookie (access or refresh): no
 * backend call, so it stays fast, Edge-safe, and works identically against the
 * MSW mocks (which the Edge runtime can't intercept). The richer rules
 * (role/area matching, onboarding completeness, approval state) run in the
 * route-group layouts (`(dashboard)`, `(onboarding)`) via the request-cached
 * `getSession()`, which CAN reach the backend and refresh tokens.
 *
 * Guests hitting a protected route are sent to `/login?next=<original>` so they
 * land back where they intended after signing in. Public app views
 * (`(public-app)`) and marketing are intentionally NOT matched: guest browse is
 * allowed there.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/config';

export function middleware(req: NextRequest) {
  const hasSession = Boolean(
    req.cookies.get(ACCESS_COOKIE)?.value || req.cookies.get(REFRESH_COOKIE)?.value,
  );
  if (hasSession) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect the authed areas only; everything else (marketing, public app,
  // auth pages, API routes, Next internals) passes through untouched.
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
};
