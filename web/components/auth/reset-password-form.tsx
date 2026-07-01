'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/auth/field';
import { ErrorBanner } from '@/components/auth/auth-layout';
import { resetPasswordSchema, fieldErrors } from '@/lib/auth/schemas';
import { postAuthPath } from '@/lib/auth/user';
import { errorMessage } from '@/lib/api/errors';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await resetPassword(token, parsed.data.password);
      // Auto-logged-in by the backend; send them where they belong.
      router.push(postAuthPath(user));
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <KeyRound className="h-7 w-7" />
      </span>
      <h1 className="text-[30px] font-semibold tracking-tight text-ink">Set a new password</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Choose a new password for your account. You&apos;ll be logged in right after.
      </p>

      <ErrorBanner message={banner} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Field
          label="New password"
          htmlFor="password"
          error={errors.password}
          hint="Use 8+ characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </Button>
      </form>

      <Link
        href="/login"
        className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to log in
      </Link>
    </div>
  );
}
