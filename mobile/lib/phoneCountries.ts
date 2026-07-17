/**
 * Supported phone-verification countries.
 *
 * The backend accepts any E.164 number (`/^\+[1-9]\d{7,14}$/`), so the *only* thing
 * gating which countries work is this list + the UI that reads it. We deliberately
 * keep it to the markets we actually launch in rather than a 200-country picker —
 * an unlisted dial code can't be typed, so a user can never send an OTP to a
 * malformed/foreign number by accident (which would still cost a real SMS).
 *
 * Adding a country later = one entry here; both phone screens pick it up.
 */
export type PhoneCountry = {
  /** ISO 3166-1 alpha-2, used as the stable key. */
  iso: 'CA' | 'IN';
  name: string;
  /** Flag emoji for the picker. */
  flag: string;
  /** Dial code, with the leading "+". */
  dial: string;
  /** National number length in digits (both markets are 10). */
  length: number;
  /** Example national number, shown as the input placeholder. */
  placeholder: string;
  /**
   * Is this national-number string a plausible *mobile* number for the country?
   * Input is already digits-only. This is a client-side sanity check, not a
   * carrier lookup — it stops obvious typos (and, for India, landline prefixes)
   * before we pay Twilio to text a dead number.
   */
  valid: (digits: string) => boolean;
};

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  {
    iso: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    dial: '+1',
    length: 10,
    placeholder: '416 555 0199',
    // NANP: area code and exchange can't start with 0 or 1.
    valid: (d) => /^[2-9]\d{9}$/.test(d),
  },
  {
    iso: 'IN',
    name: 'India',
    flag: '🇮🇳',
    dial: '+91',
    length: 10,
    placeholder: '98765 43210',
    // Indian mobile numbers start with 6, 7, 8, or 9.
    valid: (d) => /^[6-9]\d{9}$/.test(d),
  },
] as const;

/** Default country (first in the list). */
export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0];

/** Build the full E.164 string the backend expects. */
export function toE164(country: PhoneCountry, digits: string): string {
  return `${country.dial}${digits}`;
}
