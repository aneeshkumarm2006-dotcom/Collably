/**
 * Guard layout for the onboarding area. Resolves the session and enforces: guests
 * → `/login`, admins → the marketing site, and already-onboarded users → their
 * dashboard home (no reason to re-onboard). The specific creator/business step
 * pages (Phase 5) live under this group.
 */
import { requireOnboardingSession } from '@/lib/auth/guards';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardingSession();
  return <>{children}</>;
}
