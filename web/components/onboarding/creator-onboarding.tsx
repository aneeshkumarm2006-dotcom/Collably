'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';
import { clientApi } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { NICHES, CONTENT_TYPES } from '@/lib/constants';
import type { Niche, ContentType } from '@/lib/shared';
import { nicheEmoji } from '@/lib/domain-meta';
import {
  type CreatorForm,
  emptyCreatorForm,
  hasOneSocial,
  MAX_PORTFOLIO,
  toCreatorPayload,
} from '@/lib/onboarding/creator';
import { OnboardingShell, StepIntro, TogglePill } from '@/components/onboarding/onboarding-ui';
import { OnboardingCelebration } from '@/components/onboarding/onboarding-celebration';
import { SocialHandlesStep } from '@/components/onboarding/social-handles-step';
import { PortfolioUploader } from '@/components/onboarding/portfolio-uploader';
import { LocationFields } from '@/components/shared/location-fields';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const STEPS = ['Bio & niche', 'Location', 'Socials', 'Content', 'Portfolio'];
const BIO_MAX = 2000;
const SOCIALS_STEP = 2;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * Creator onboarding flow (Phase 5). A single card with internal step state — no
 * page reloads. Steps: Bio + niche → Location → Social handles → Content types →
 * Portfolio. Finishing upserts via `PUT /api/profile/creator` (which marks the
 * user onboarded server-side), then shows the celebratory finish before routing
 * into the creator dashboard.
 */
export function CreatorOnboarding({ firstName }: { firstName: string }) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [form, setForm] = useState<CreatorForm>(emptyCreatorForm);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<CreatorForm>) => setForm((f) => ({ ...f, ...partial }));
  const isLast = index === STEPS.length - 1;

  /** Required fields per step (others are optional). */
  function canAdvance(step: number): boolean {
    if (step === 0) return form.niche.length >= 1;
    if (step === SOCIALS_STEP) return hasOneSocial(form);
    return true;
  }

  function back() {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  }

  async function next() {
    setError(null);
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    // Final guard: the backend requires ≥1 connected platform.
    if (!hasOneSocial(form)) {
      setError('Add at least one platform with a handle and a valid profile link.');
      setIndex(SOCIALS_STEP);
      return;
    }
    setSubmitting(true);
    try {
      await clientApi.profiles.saveCreator(toCreatorPayload(form));
      setDone(true);
      // Best-effort sync of the client session (navbar/avatar); the dashboard
      // guard re-reads the server session regardless, so this never blocks.
      void refresh().catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <OnboardingCelebration
        title={`You're all set${firstName ? `, ${firstName}` : ''}!`}
        message="Your creator profile is live. Start browsing campaigns that match your niche and land your first collab."
        ctaLabel="Explore campaigns"
        loading={navigating}
        onContinue={() => {
          setNavigating(true);
          router.push('/dashboard/creator');
        }}
      />
    );
  }

  return (
    <OnboardingShell
      steps={STEPS}
      current={index}
      onBack={index > 0 ? back : undefined}
      onNext={next}
      canAdvance={canAdvance(index)}
      isLast={isLast}
      submitting={submitting}
      error={error}
    >
      {index === 0 && (
        <div>
          <StepIntro
            title="Tell brands about you"
            description="Your niche helps us match you with the right campaigns."
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="font-mono text-[11px] text-faint">
                {form.bio.length} / {BIO_MAX}
              </span>
            </div>
            <Textarea
              id="bio"
              maxLength={BIO_MAX}
              value={form.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              placeholder="Toronto food & lifestyle creator sharing the city's best bites…"
            />
          </div>
          <div className="mt-5">
            <Label>
              Your niches <span className="font-normal text-faint">(pick at least 1)</span>
            </Label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {NICHES.map((n: Niche) => (
                <TogglePill
                  key={n}
                  label={n}
                  emoji={nicheEmoji(n)}
                  selected={form.niche.includes(n)}
                  onClick={() => patch({ niche: toggle(form.niche, n) })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {index === 1 && (
        <div>
          <StepIntro
            title="Where are you based?"
            description="Brands love working with local creators."
          />
          <LocationFields value={form.location} onChange={(location) => patch({ location })} />
        </div>
      )}

      {index === SOCIALS_STEP && (
        <div>
          <StepIntro
            title="Where can brands find you?"
            description="Connect at least one platform — add a handle and its profile link."
          />
          <SocialHandlesStep
            social={form.social}
            onSocialChange={(partial) => patch({ social: { ...form.social, ...partial } })}
            isUGCOnly={form.isUGCOnly}
            onUGCChange={(isUGCOnly) => patch({ isUGCOnly })}
          />
        </div>
      )}

      {index === 3 && (
        <div>
          <StepIntro
            title="What do you create?"
            description="Pick the formats you're great at. Optional."
          />
          <div className="flex flex-wrap gap-2.5">
            {CONTENT_TYPES.map((ct: ContentType) => (
              <TogglePill
                key={ct}
                label={ct}
                selected={form.contentTypes.includes(ct)}
                onClick={() => patch({ contentTypes: toggle(form.contentTypes, ct) })}
              />
            ))}
          </div>
        </div>
      )}

      {index === 4 && (
        <div>
          <StepIntro
            title="Show your best work"
            description={`Add up to ${MAX_PORTFOLIO} pieces — these sell you to brands. Optional.`}
          />
          <PortfolioUploader
            items={form.portfolio}
            onChange={(portfolio) => patch({ portfolio })}
            max={MAX_PORTFOLIO}
          />
        </div>
      )}
    </OnboardingShell>
  );
}
