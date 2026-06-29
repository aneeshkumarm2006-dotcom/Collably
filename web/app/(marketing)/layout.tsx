import { SiteChrome } from '@/components/shared/site-chrome';

/** Public marketing surface: wraps every page in the auth-aware navbar + footer. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
