import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Join Collably to connect local businesses with creators for gifting campaigns and collabs.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthLayout
      tagline="Start earning from your audience today."
      subtitle="Join thousands of Canadian creators and brands making collabs happen, with no agencies and no gatekeeping."
      proof={[
        { value: 'Free', label: 'to join' },
        { value: '0', label: 'follower minimum' },
        { value: '5 min', label: 'to set up' },
      ]}
    >
      <SignupForm next={next} />
    </AuthLayout>
  );
}
