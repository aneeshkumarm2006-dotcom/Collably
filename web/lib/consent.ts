/**
 * Cookie-consent state for analytics that set cookies (GA4). Cookieless
 * providers (Plausible) don't require consent and ignore this entirely.
 *
 * The decision persists in `localStorage` and is broadcast via a window event so
 * the consent banner and the script loader stay in sync without prop drilling.
 */
import { config } from '@/lib/config';

export type ConsentState = 'granted' | 'denied' | 'unset';

const STORAGE_KEY = 'collably_cookie_consent';
export const CONSENT_EVENT = 'collably:consent-change';

/** Does the configured provider set cookies (and therefore need consent)? */
export function providerRequiresConsent(): boolean {
  return config.analytics.provider === 'ga4';
}

/** Read the persisted decision (`unset` until the visitor chooses, or on the server). */
export function readConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unset';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return 'unset';
  }
}

/** Persist a decision and notify listeners (banner + script loader). */
export function writeConsent(state: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Private mode / storage disabled: fall through; the in-memory event still fires.
  }
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state }));
}
