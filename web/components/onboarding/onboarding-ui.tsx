'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, type LucideIcon } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { BrandMark } from '@/components/shared/brand-mark';
import { StepProgress } from '@/components/shared/step-progress';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/auth/auth-layout';
import { cn } from '@/lib/utils';

/**
 * Shared onboarding chrome (Phase 5). `OnboardingFrame` is the page scaffold:
 * page-grey background, a slim top bar (brand + sign-out), and a centered column.
 * Used by both the stepper shell and the celebratory finish. `OnboardingShell`
 * adds the card, the `StepProgress` stepper, and the Back / Continue nav.
 *
 * There is intentionally no "Skip" link: onboarding is required (the
 * `(onboarding)` + `(dashboard)` guards bounce an un-onboarded user straight
 * back here), so a skip would only loop. Sign-out is offered instead.
 */
export function OnboardingFrame({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Collably home">
          <BrandMark />
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Log out
        </button>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pb-20 sm:px-6">{children}</main>
    </div>
  );
}

export interface OnboardingShellProps {
  /** Step labels for the progress stepper (input steps only, not the finish). */
  steps: string[];
  /** 0-based index of the active step. */
  current: number;
  onBack?: () => void;
  onNext: () => void;
  /** Whether the current step's required fields are satisfied. */
  canAdvance: boolean;
  /** Last input step → the primary button submits ("Finish setup"). */
  isLast: boolean;
  submitting?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export function OnboardingShell({
  steps,
  current,
  onBack,
  onNext,
  canAdvance,
  isLast,
  submitting,
  error,
  children,
}: OnboardingShellProps) {
  return (
    <OnboardingFrame>
      <div className="rounded-2xl border border-hair bg-card p-6 shadow-card sm:p-8">
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-brand">
              Step {current + 1} of {steps.length}
            </span>
            <span className="font-mono text-[13px] text-faint">
              {Math.round(((current + 1) / steps.length) * 100)}%
            </span>
          </div>
          <StepProgress steps={steps} current={current} />
        </div>

        {/* Each step animates in; reduced-motion users get the global no-op. */}
        <div key={current} className="animate-in fade-in slide-in-from-right-3 duration-300">
          {children}
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack || submitting}
            className={cn(!onBack && 'pointer-events-none opacity-0')}
          >
            <ArrowLeft /> Back
          </Button>
          <Button type="button" size="lg" onClick={onNext} disabled={!canAdvance || submitting}>
            {submitting ? (
              'Saving…'
            ) : isLast ? (
              <>
                Finish setup <Check />
              </>
            ) : (
              <>
                Continue <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </div>
    </OnboardingFrame>
  );
}

/** Per-step heading + supporting line, shown above the step's inputs. */
export function StepIntro({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}

/** Rounded toggle pill for multi-select sets (niche / content types). */
export function TogglePill({
  label,
  selected,
  onClick,
  icon: Icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-brand bg-brand text-white'
          : 'border-hair-strong bg-card text-muted hover:border-brand-secondary hover:text-ink',
      )}
    >
      {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
      {label}
    </button>
  );
}

/** Selection card for single-select sets (business category): a bigger target than a pill. */
export function SelectCard({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border bg-card px-4 py-3.5 text-left text-[15px] font-semibold transition-colors',
        selected
          ? 'border-2 border-brand bg-brand-soft text-brand'
          : 'border-hair-strong text-ink hover:border-brand-secondary',
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      <span className="truncate">{label}</span>
    </button>
  );
}
