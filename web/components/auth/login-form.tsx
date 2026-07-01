'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/auth/field';
import { GoogleButton } from '@/components/auth/google-button';
import { ErrorBanner, OrDivider } from '@/components/auth/auth-layout';
import { loginSchema, fieldErrors } from '@/lib/auth/schemas';
import { postAuthPath } from '@/lib/auth/user';
import { errorMessage } from '@/lib/api/errors';
import { sanitizeNext } from '@/lib/auth/redirect';
import { track } from '@/lib/analytics';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const target = sanitizeNext(next);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await login(parsed.data);
      track('login_completed', { method: 'password' });
      router.push(target ?? postAuthPath(user));
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleGoogle(idToken: string) {
    setBanner(null);
    setSubmitting(true);
    try {
      const { user } = await loginWithGoogle(idToken);
      track('login_completed', { method: 'google' });
      router.push(target ?? postAuthPath(user));
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-[30px] font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-[15px] text-muted">Log in to your Collably account.</p>

      <div className="mt-7">
        <GoogleButton onCredential={handleGoogle} text="signin_with" disabled={submitting} />
      </div>
      <OrDivider />

      <ErrorBanner message={banner} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          action={
            <Link href="/forgot-password" className="text-[13px] font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Collably?{' '}
        <Link
          href={target ? `/signup?next=${encodeURIComponent(target)}` : '/signup'}
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
