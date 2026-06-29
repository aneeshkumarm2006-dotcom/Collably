/**
 * Global test setup for the Vitest (jsdom) suite — Phase 14.
 *
 * Adds jest-dom matchers, cleans the DOM between tests, stubs the Next.js
 * runtime modules our shared components touch (`next/image`, `next/link`,
 * `next/navigation`), and polyfills the browser APIs jsdom omits but Radix /
 * next-themes / our widgets rely on (`matchMedia`, `ResizeObserver`,
 * `IntersectionObserver`, `scrollIntoView`, pointer-capture). Server-only guards
 * are neutered so a util module that transitively imports `server-only` still
 * loads under the test runtime.
 */
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';

afterEach(() => {
  cleanup();
});

// `server-only` throws if imported outside a Server Component — neutralize it so
// shared modules that re-export across the server/client boundary still import.
vi.mock('server-only', () => ({}));

// next/image → a plain <img> (jsdom has no image optimizer). Strips Next-only
// props so React doesn't warn about unknown DOM attributes.
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, fill, priority, sizes, quality, loader, placeholder, blurDataURL, unoptimized, ...rest }: Record<string, unknown>) =>
    React.createElement('img', {
      src: typeof src === 'string' ? src : '',
      alt: typeof alt === 'string' ? alt : '',
      ...rest,
    }),
}));

// next/link → a plain <a> wrapper (no router context needed in unit tests).
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, prefetch, replace, scroll, shallow, ...rest }: Record<string, unknown>) =>
    React.createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as React.ReactNode),
}));

// next/navigation → inert hooks. Individual tests can `vi.mocked(usePathname).mockReturnValue(...)`.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// --- jsdom polyfills ----------------------------------------------------------

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
globalThis.ResizeObserver = MockObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
window.ResizeObserver = globalThis.ResizeObserver;
window.IntersectionObserver = globalThis.IntersectionObserver;

// Radix relies on these jsdom-missing element methods.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = vi.fn(() => false);
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = vi.fn();
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn();
