/**
 * Barrel for the auth-screen building blocks (PRD §7.1, Phase 10). Import from
 * `@/components/auth` so the welcome/login/signup/reset screens stay decoupled
 * from file layout.
 */
export { AuthShell, type AuthShellProps } from './AuthShell';
export {
  PremiumAuthLayout,
  type PremiumAuthLayoutProps,
  type PremiumAuthRole,
  type PremiumAuthMode,
} from './PremiumAuthLayout';
export { SignupForm, type SignupFormProps, type SignupRole } from './SignupForm';
export { LoginForm } from './LoginForm';
export { AuthFooter, type AuthFooterProps } from './AuthFooter';
export { AuthInput, type AuthInputProps } from './AuthInput';
export { GoogleButton, type GoogleButtonProps } from './GoogleButton';
export { AppleButton, type AppleButtonProps } from './AppleButton';
export { FormBanner, type FormBannerProps } from './FormBanner';
export { OrDivider } from './OrDivider';
