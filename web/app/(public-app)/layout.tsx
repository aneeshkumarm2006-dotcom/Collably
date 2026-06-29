import { SiteChrome } from '@/components/shared/site-chrome';

/**
 * Public app views (explore, campaign/profile detail) — guest-accessible, framed
 * by the same navbar + footer as the marketing site. Authed users keep their
 * avatar/bell in the navbar; gated actions (apply, etc.) prompt sign-up.
 */
export default function PublicAppLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
