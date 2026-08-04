/**
 * Path-token variant of the reset-password screen. The transactional email links
 * to the **web** reset route `https://www.localcreatorcrew.com/reset-password/<token>`
 * (token in the PATH, matching the deployed website). When the app is installed,
 * that https link opens here via Android App Links / iOS Universal Links instead
 * of the browser.
 *
 * The sibling `../reset-password.tsx` screen reads the token from
 * `useLocalSearchParams`, which merges BOTH the `?token=` query (used by the
 * in-app forgot-password dev flow) AND dynamic path segments like this `[token]`.
 * So we reuse that exact screen here — no logic is duplicated, and the token is
 * parsed correctly whether it arrives in the path or the query.
 */
export { default } from '../reset-password';
