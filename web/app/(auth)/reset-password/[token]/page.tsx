import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Set a new password for your Collably account.',
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthLayout
      tagline="Almost there — set a new password."
      subtitle="Pick a strong password and we'll log you straight back in."
      proof={[
        { value: '8,500+', label: 'creators' },
        { value: '1,200+', label: 'brands' },
      ]}
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
