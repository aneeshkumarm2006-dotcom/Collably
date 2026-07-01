import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your Collably account to manage campaigns, applications, and collabs.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthLayout
      tagline="Where collabs happen."
      subtitle="Log back in to manage your campaigns, review applications, and keep your collabs moving."
      proof={[
        { value: '8,500+', label: 'creators' },
        { value: '1,200+', label: 'brands' },
        { value: '4,200+', label: 'collabs done' },
      ]}
    >
      <LoginForm next={next} />
    </AuthLayout>
  );
}
