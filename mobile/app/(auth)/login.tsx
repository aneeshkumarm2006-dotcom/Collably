/**
 * Login route (PRD §7.1). Thin wrapper around the shared `PremiumAuthLayout`,
 * which owns the yellow hero, the Sign up / Sign in toggle, and both forms. The
 * toggle switches forms in place (no navigation), so login ⇄ signup never flashes.
 *
 * On success the form hands the backend's auth payload to `authStore.signIn()` and
 * does NOT navigate manually — the root auth gate (`app/_layout.tsx`) reacts to the
 * new session and routes the user to their role home (or onboarding if incomplete).
 */
import { PremiumAuthLayout } from '@/components/auth';

export default function LoginScreen() {
  return <PremiumAuthLayout initialMode="signin" />;
}
