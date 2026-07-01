'use client';

import { useEffect, useState } from 'react';
import { CONSENT_EVENT, readConsent, type ConsentState } from '@/lib/consent';

/**
 * Subscribe to the persisted cookie-consent decision. Starts `unset` on the
 * server / first paint (so SSR + hydration agree), then resolves from
 * `localStorage` on mount and updates live when the banner writes a choice.
 */
export function useConsent(): ConsentState {
  const [consent, setConsent] = useState<ConsentState>('unset');

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail;
      setConsent(detail ?? readConsent());
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return consent;
}
