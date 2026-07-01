import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { onboardingPath } from '@/lib/auth/user';
import { CreatorOnboarding } from '@/components/onboarding/creator-onboarding';

export const metadata: Metadata = {
  title: 'Set up your creator profile',
  description: 'Tell brands about your niche, socials, and best work to start landing collabs.',
};

/**
 * Creator onboarding entry (`/onboarding/creator`). The `(onboarding)` layout
 * guard already enforces "authed + not onboarded + not admin"; here we additionally
 * bounce a business account to its own onboarding so each role sets up the right
 * profile. The flow itself is a client component.
 */
export default async function CreatorOnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role !== 'creator') redirect(onboardingPath(session.user.role));

  const firstName = session.user.name.trim().split(' ')[0] ?? '';
  return <CreatorOnboarding firstName={firstName} />;
}
