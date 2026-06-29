'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Store } from 'lucide-react';

import { useAuth, type SessionUser } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/auth/field';
import { GoogleButton } from '@/components/auth/google-button';
import { ErrorBanner, OrDivider } from '@/components/auth/auth-layout';
import { signupSchema, fieldErrors } from '@/lib/auth/schemas';
import { onboardingPath, postAuthPath } from '@/lib/auth/user';
import { errorMessage } from '@/lib/api/errors';
import { sanitizeNext } from '@/lib/auth/redirect';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Role = 'business' | 'creator';

const ROLES: { role: Role; icon: typeof Store; title: string; sub: string }[] = [
  { role: 'business', icon: Store, title: "I'm a Business", sub: 'Post campaigns & find creators' },
  { role: 'creator', icon: Sparkles, title: "I'm a Creator", sub: 'Find collabs & earn rewards' },
];

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const target = sanitizeNext(next);

  /** After auth, new accounts go to onboarding; honor `next` only if onboarded. */
  function routeAfter(user: SessionUser) {
    router.push(user.isOnboarded ? (target ?? postAuthPath(user)) : onboardingPath(user.role));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setBanner(null);

    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await register({ ...parsed.data, role });
      track('signup_completed', { role, method: 'password' });
      routeAfter(user);
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleGoogle(idToken: string) {
    if (!role) return;
    setBanner(null);
    setSubmitting(true);
    try {
      const { user } = await loginWithGoogle(idToken, role);
      track('signup_completed', { role, method: 'google' });
      routeAfter(user);
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  // Step 1: choose a role.
  if (!role) {
    return (
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">Join Collably</h1>
        <p className="mt-1.5 text-[15px] text-muted">First, tell us who you are.</p>

        <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {ROLES.map(({ role: r, icon: Icon, title, sub }) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setErrors({});
                setBanner(null);
                track('signup_started', { role: r });
              }}
              className="group flex flex-col items-center gap-2 rounded-lg border border-hair-strong bg-card px-4 py-7 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card"
            >
              <Icon className="h-8 w-8 text-brand" />
              <span className="text-[17px] font-semibold text-ink">{title}</span>
              <span className="text-[13px] text-muted">{sub}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link
            href={target ? `/login?next=${encodeURIComponent(target)}` : '/login'}
            className="font-semibold text-brand hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: account details for the chosen role.
  const isBusiness = role === 'business';
  return (
    <div>
      <span className="mb-4 inline-flex items-center gap-2 rounded-sm bg-brand-soft px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-brand">
        {isBusiness ? 'Business account' : 'Creator account'}
        <button
          type="button"
          onClick={() => setRole(null)}
          className="text-muted underline hover:text-ink"
        >
          change
        </button>
      </span>

      <h1 className="text-[30px] font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-muted">A few details and you&apos;re in.</p>

      <div className="mt-7">
        <GoogleButton onCredential={handleGoogle} text="signup_with" disabled={submitting} />
      </div>
      <OrDivider />

      <ErrorBanner message={banner} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label={isBusiness ? 'Business name' : 'Full name'} htmlFor="name" error={errors.name}>
          <Input
            id="name"
            autoComplete={isBusiness ? 'organization' : 'name'}
            placeholder={isBusiness ? 'Your business name' : 'Your name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

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

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setRole(null)}
        className={cn(
          'mx-auto mt-6 flex items-center gap-1.5 text-sm text-muted hover:text-ink',
        )}
      >
        <ArrowLeft className="h-4 w-4" /> Choose a different role
      </button>
    </div>
  );
}
