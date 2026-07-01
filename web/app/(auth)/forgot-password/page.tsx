import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your Collably password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      tagline="Forgot your password? No problem."
      subtitle="We'll email you a secure link so you can set a new one and get right back to your collabs."
      proof={[
        { value: '30 min', label: 'link validity' },
        { value: 'Secure', label: 'one-time token' },
      ]}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
