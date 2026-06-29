/**
 * Lightweight, provider-agnostic analytics façade.
 *
 * `track(event, props)` fans a typed custom event out to whichever provider is
 * configured (`config.analytics.provider`): Plausible (`window.plausible`) or
 * GA4 (`window.gtag`). When the provider is `none` (or the script hasn't loaded,
 * e.g. GA4 before cookie consent), calls are silent no-ops, so call sites never
 * need to guard. Import-and-call from any client component:
 *
 *   import { track } from '@/lib/analytics';
 *   track('campaign_apply', { campaignId });
 *
 * No PII is ever sent: only the small, enumerated event names plus coarse props
 * below. Page views are handled automatically by the provider scripts.
 */
import { config } from '@/lib/config';

/** The enumerated set of product events we track on key CTAs / conversions. */
export type AnalyticsEvent =
  | 'cta_get_started' // hero / nav / live-rail "get started" / "sign up to apply"
  | 'cta_login' // nav "log in"
  | 'signup_started' // role chosen on /signup
  | 'signup_completed' // account created
  | 'login_completed' // signed in
  | 'campaign_apply' // creator applied to a campaign
  | 'campaign_published' // business published a campaign
  | 'contact_submitted'; // marketing contact form sent

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

interface PlausibleWindow {
  plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
}
interface GtagWindow {
  gtag?: (command: 'event' | 'config' | 'consent' | 'js', ...args: unknown[]) => void;
}
type AnalyticsWindow = Window & PlausibleWindow & GtagWindow;

/** Whether any provider is configured (scripts may still be consent-gated). */
export function analyticsEnabled(): boolean {
  return config.analytics.provider !== 'none';
}

/** Drop undefined props so providers don't record empty keys. */
function cleanProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const out: AnalyticsProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Record a product event. Safe to call anywhere on the client; no-op on server. */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === 'undefined' || !analyticsEnabled()) return;
  const w = window as AnalyticsWindow;
  const cleaned = cleanProps(props);

  try {
    if (config.analytics.provider === 'plausible') {
      w.plausible?.(event, cleaned ? { props: cleaned } : undefined);
    } else if (config.analytics.provider === 'ga4') {
      w.gtag?.('event', event, cleaned ?? {});
    }
  } catch {
    // Analytics must never break the app, so swallow any provider error.
  }
}
