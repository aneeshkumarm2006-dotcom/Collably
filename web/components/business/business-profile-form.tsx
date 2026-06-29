'use client';

import { useState } from 'react';
import { Instagram, Loader2, Music2, Youtube } from 'lucide-react';

import { clientApi } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { toast } from '@/lib/toast';
import { CATEGORIES } from '@/lib/constants';
import type { BusinessProfile, Category } from '@/lib/shared';
import { categoryEmoji } from '@/lib/domain-meta';
import {
  type BusinessForm,
  businessFormFromProfile,
  toBusinessPayload,
} from '@/lib/onboarding/business';
import { SelectCard } from '@/components/onboarding/onboarding-ui';
import { LocationFields } from '@/components/shared/location-fields';
import { LogoUploader } from '@/components/onboarding/logo-uploader';
import { ErrorBanner } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ABOUT_MAX = 2000;

/** A titled card section grouping a slice of the profile form. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hair bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Business profile editor (Phase 8). A single-page, sectioned form prefilled from
 * the existing profile that submits via `PUT /api/profile/business` — reusing the
 * onboarding form model (`businessFormFromProfile` / `toBusinessPayload`) so the
 * payload + validation stay identical to onboarding.
 */
export function BusinessProfileForm({ profile }: { profile: BusinessProfile }) {
  const [form, setForm] = useState<BusinessForm>(() => businessFormFromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<BusinessForm>) => setForm((f) => ({ ...f, ...partial }));
  const setSocial = (partial: Partial<BusinessForm['socialLinks']>) =>
    patch({ socialLinks: { ...form.socialLinks, ...partial } });

  async function save() {
    setError(null);
    if (!form.businessName.trim()) {
      setError('Add your business name.');
      return;
    }
    if (!form.category) {
      setError('Pick a category.');
      return;
    }
    setSaving(true);
    try {
      await clientApi.profiles.saveBusiness(toBusinessPayload(form));
      toast.success('Profile updated');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Section title="Basics" description="Your name, category, and what creators see first.">
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
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {CATEGORIES.map((c: Category) => (
              <SelectCard
                key={c}
                label={c}
                emoji={categoryEmoji(c)}
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
            rows={4}
            placeholder="A farm-to-table bistro serving seasonal Ontario produce…"
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>
      </Section>

      <Section title="Location & website" description="Creators filter campaigns by city.">
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
      </Section>

      <Section title="Social links" description="All optional — add what you have.">
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
      </Section>

      <Section title="Logo" description="Appears on your profile and every campaign.">
        <LogoUploader value={form.logo} onChange={(logo) => patch({ logo })} />
      </Section>

      {error && <ErrorBanner message={error} />}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-end gap-3 border-t border-hair bg-card/90 px-5 py-3.5 backdrop-blur sm:-mx-6 sm:px-6">
        <Button size="lg" onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
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
