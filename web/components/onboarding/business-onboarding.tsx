'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Instagram, Music2, Youtube } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { clientApi } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/lib/shared';
import { categoryIcon } from '@/lib/domain-meta';
import { type BusinessForm, emptyBusinessForm, toBusinessPayload } from '@/lib/onboarding/business';
import {
  OnboardingShell,
  SelectCard,
  StepIntro,
} from '@/components/onboarding/onboarding-ui';
import { OnboardingCelebration } from '@/components/onboarding/onboarding-celebration';
import { LogoUploader } from '@/components/onboarding/logo-uploader';
import { LocationFields } from '@/components/shared/location-fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const STEPS = ['Basics', 'Location', 'Socials', 'Logo'];
const ABOUT_MAX = 2000;

/**
 * Business onboarding flow (Phase 5). A single card with internal step state.
 * Steps: Basics (name / category / about) → Location + website → Social links →
 * Logo upload. Finishing upserts via `PUT /api/profile/business` (which marks
 * the user onboarded server-side), then shows the celebratory finish before
 * routing into the business dashboard.
 */
export function BusinessOnboarding({ businessName }: { businessName: string }) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [form, setForm] = useState<BusinessForm>(() => emptyBusinessForm(businessName));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<BusinessForm>) => setForm((f) => ({ ...f, ...partial }));
  const setSocial = (partial: Partial<BusinessForm['socialLinks']>) =>
    patch({ socialLinks: { ...form.socialLinks, ...partial } });
  const isLast = index === STEPS.length - 1;

  /** Step 1 needs a name + category; the rest are optional. */
  function canAdvance(step: number): boolean {
    if (step === 0) return form.businessName.trim().length >= 1 && !!form.category;
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
    if (!form.businessName.trim() || !form.category) {
      setError('Add your business name and category first.');
      setIndex(0);
      return;
    }
    setSubmitting(true);
    try {
      await clientApi.profiles.saveBusiness(toBusinessPayload(form));
      setDone(true);
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
        title={`You're all set${form.businessName.trim() ? `, ${form.businessName.trim()}` : ''}!`}
        message="Your profile is ready. Post your first campaign and start finding creators."
        ctaLabel="Go to dashboard"
        loading={navigating}
        onContinue={() => {
          setNavigating(true);
          router.push('/dashboard/business');
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
            title="Tell us about your business"
            description="This is what creators see first."
          />
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={form.businessName}
              maxLength={160}
              autoComplete="organization"
              placeholder="e.g. Maple & Thyme"
              onChange={(e) => patch({ businessName: e.target.value })}
            />
          </div>
          <div className="mt-5">
            <Label>Category</Label>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((c: Category) => (
                <SelectCard
                  key={c}
                  label={c}
                  icon={categoryIcon(c)}
                  selected={form.category === c}
                  onClick={() => patch({ category: c })}
                />
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="about">About your business</Label>
              <span className="font-mono text-[11px] text-faint">
                {form.description.length} / {ABOUT_MAX}
              </span>
            </div>
            <Textarea
              id="about"
              maxLength={ABOUT_MAX}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="A farm-to-table bistro serving seasonal Ontario produce…"
            />
          </div>
        </div>
      )}

      {index === 1 && (
        <div>
          <StepIntro
            title="Where are you based?"
            description="Creators filter campaigns by city."
          />
          <LocationFields value={form.location} onChange={(location) => patch({ location })} />
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              inputMode="url"
              value={form.website}
              maxLength={2048}
              autoComplete="url"
              placeholder="https://yourbrand.com"
              onChange={(e) => patch({ website: e.target.value })}
            />
          </div>
        </div>
      )}

      {index === 2 && (
        <div>
          <StepIntro title="Connect your socials" description="All optional. Add what you have." />
          <div className="space-y-3">
            <SocialLinkInput
              icon={<Instagram className="h-4 w-4" />}
              label="Instagram"
              value={form.socialLinks.instagram}
              placeholder="@yourbrand or profile URL"
              onChange={(instagram) => setSocial({ instagram })}
            />
            <SocialLinkInput
              icon={<Youtube className="h-4 w-4" />}
              label="YouTube"
              value={form.socialLinks.youtube}
              placeholder="Channel URL"
              onChange={(youtube) => setSocial({ youtube })}
            />
            <SocialLinkInput
              icon={<Music2 className="h-4 w-4" />}
              label="TikTok"
              value={form.socialLinks.tiktok}
              placeholder="@yourbrand or profile URL"
              onChange={(tiktok) => setSocial({ tiktok })}
            />
          </div>
        </div>
      )}

      {index === 3 && (
        <div>
          <StepIntro
            title="Add your logo"
            description="It'll appear on your profile and every campaign. Optional."
          />
          <LogoUploader value={form.logo} onChange={(logo) => patch({ logo })} />
        </div>
      )}
    </OnboardingShell>
  );
}

function SocialLinkInput({
  icon,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = `social-${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted">
        {icon}
      </span>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor={id} className="sr-only">
          {label}
        </Label>
        <Input
          id={id}
          value={value}
          maxLength={200}
          autoComplete="off"
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
