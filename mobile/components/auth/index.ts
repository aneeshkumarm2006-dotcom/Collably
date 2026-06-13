/**
 * Barrel for the auth-screen building blocks (PRD §7.1, Phase 10). Import from
 * `@/components/auth` so the welcome/login/signup/reset screens stay decoupled
 * from file layout.
 */
export { AuthShell, type AuthShellProps } from './AuthShell';
export { AuthInput, type AuthInputProps } from './AuthInput';
export { GoogleButton, type GoogleButtonProps } from './GoogleButton';
export { FormBanner, type FormBannerProps } from './FormBanner';
export { OrDivider } from './OrDivider';
