'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/auth/field';
import { ErrorBanner } from '@/components/auth/auth-layout';
import { forgotPasswordSchema, fieldErrors } from '@/lib/auth/schemas';
import { toApiError, errorMessage } from '@/lib/api/errors';

/** Shape of the backend `/auth/forgot-password` body (passed through verbatim). */
interface ForgotResponse {
  message?: string;
  /** Present only in non-production; lets dev jump straight to the reset page. */
  devResetToken?: string;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ email: string; devResetToken?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data: ForgotResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw toApiError(res.status, data);
      setSent({ email: parsed.data.email, devResetToken: data.devResetToken });
    } catch (err) {
      setBanner(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div>
        <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">Check your inbox</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          We&apos;ve sent a reset link to <b className="text-ink">{sent.email}</b>. It expires in 30
          minutes. Check your spam folder if you don&apos;t see it.
        </p>

        {sent.devResetToken && (
          <Link
            href={`/reset-password/${sent.devResetToken}`}
            className="mt-4 inline-block rounded-md border border-warn/40 bg-warn-soft px-3.5 py-2.5 text-[13px] font-medium text-warn hover:underline"
          >
            Dev shortcut → reset with this token
          </Link>
        )}

        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setSent(null)}>
          Use a different email
        </Button>

        <Link
          href="/login"
          className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Mail className="h-7 w-7" />
      </span>
      <h1 className="text-[30px] font-semibold tracking-tight text-ink">Forgot your password?</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Enter the email tied to your account and we&apos;ll send you a link to reset your password.
      </p>

      <ErrorBanner message={banner} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
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
