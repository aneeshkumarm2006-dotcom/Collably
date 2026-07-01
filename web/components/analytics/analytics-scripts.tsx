'use client';

import Script from 'next/script';

import { config } from '@/lib/config';
import { providerRequiresConsent } from '@/lib/consent';
import { useConsent } from './use-consent';

/**
 * Loads the configured analytics provider's script(s). Mounted once in the root
 * layout. Renders nothing when analytics are off (`provider === 'none'`).
 *
 * - Plausible is cookieless → loaded unconditionally.
 * - GA4 sets cookies → loaded only once the visitor grants consent (the
 *   `CookieConsent` banner). Until then, `track()` calls are silent no-ops.
 */
export function AnalyticsScripts() {
  const consent = useConsent();
  const { provider, plausibleDomain, plausibleSrc, ga4Id } = config.analytics;

  if (provider === 'plausible' && plausibleDomain) {
    return (
      <Script
        defer
        data-domain={plausibleDomain}
        src={plausibleSrc}
        strategy="afterInteractive"
      />
    );
  }

  if (provider === 'ga4' && ga4Id) {
    // Cookie-setting provider: wait for explicit consent.
    if (providerRequiresConsent() && consent !== 'granted') return null;
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${ga4Id}', { anonymize_ip: true });
          `}
        </Script>
      </>
    );
  }

  return null;
}
