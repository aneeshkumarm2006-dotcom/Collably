/**
 * Top-level component barrel (PRD §16). Re-exports the whole shared component
 * library by group so screens can `import { Button, CampaignCard, Header } from
 * '@/components'`. The `ThemeProvider`/`useTheme` runtime theme lives alongside.
 */
export * from './ui';
export * from './shared';
export * from './campaign';
export * from './creator';
export * from './business';
export { ThemeProvider, useTheme, type Theme } from './ThemeProvider';
