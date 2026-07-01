import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { onboardingPath } from '@/lib/auth/user';
import { BusinessOnboarding } from '@/components/onboarding/business-onboarding';

export const metadata: Metadata = {
  title: 'Set up your business',
  description: 'Add your business details, location, and logo to start posting campaigns.',
};

/**
 * Business onboarding entry (`/onboarding/business`). The `(onboarding)` layout
 * guard enforces "authed + not onboarded + not admin"; here we additionally bounce
 * a creator account to its own onboarding. The business name is pre-filled from the
 * account name captured at sign-up.
 */
export default async function BusinessOnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role !== 'business') redirect(onboardingPath(session.user.role));

  return <BusinessOnboarding businessName={session.user.name.trim()} />;
}
