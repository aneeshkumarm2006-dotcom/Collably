/**
 * Signup route (PRD §7.1). Thin wrapper around the shared `PremiumAuthLayout`,
 * which owns the yellow hero, the Sign up / Sign in toggle, and both forms.
 *
 * A `?role=` query param (from the welcome role tiles) pre-selects the role and
 * drives the hero copy; arriving without one shows an inline role picker first.
 * The role is read every render — expo-router can hydrate the param a render late,
 * and the layout keeps it across the in-place Sign in ⇄ Sign up toggle.
 */
import { useLocalSearchParams } from 'expo-router';
import { PremiumAuthLayout, type PremiumAuthRole } from '@/components/auth';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: PremiumAuthRole =
    params.role === 'business' || params.role === 'creator' ? params.role : null;

  return <PremiumAuthLayout initialMode="signup" initialRole={role} />;
}
