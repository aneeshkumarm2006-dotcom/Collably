/**
 * Creator onboarding (PRD §7.2). A single screen with internal step state and a
 * progress stepper — no exit until complete (the `(onboarding)` stack disables the
 * back gesture; the gate keeps the user here until `isOnboarded` flips).
 *
 * 6 steps: bio + niche → location → socials + followers → content types + UGC
 * toggle → portfolio (up to 6 images → Cloudinary) → review & finish. Finishing
 * upserts the profile via `PUT /api/profile/creator`, which marks the User
 * onboarded server-side; we mirror that into the auth store so the root gate
 * routes to the creator home.
 */
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { OnboardingShell } from '@/components/onboarding';
import { FormBanner } from '@/components/auth';
import { PortfolioGrid } from '@/components/creator';
import { Field, TextField, TextArea, SwitchRow, TagChip, AutocompleteField } from '@/components/ui';
import { COUNTRIES, REGIONS, CITY_NAMES, locationForCity } from '@/lib/locations';
import { useTheme } from '@/components/ThemeProvider';
import {
  NICHES,
  CONTENT_TYPES,
  type Niche,
  type ContentType,
} from '@/constants';
import type { GeoLocation, PortfolioItem, PublicUser, CreatorProfile } from '@/types';
import { api, isApiError } from '@/lib/api';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useAuthStore } from '@/store/authStore';

const TOTAL_STEPS = 6;
const STEP_TITLES = ['About', 'Location', 'Socials', 'Content', 'Portfolio', 'Review'];
const MAX_PORTFOLIO = 6;

type CreatorForm = {
  bio: string;
  niche: Niche[];
  location: GeoLocation;
  social: {
    igHandle: string;
    igLink: string;
    igFollowers: string;
    igEngagement: string;
    ytHandle: string;
    ytLink: string;
    ytSubs: string;
    ttHandle: string;
    ttLink: string;
    ttFollowers: string;
  };
  contentTypes: ContentType[];
  isUGCOnly: boolean;
  portfolio: PortfolioItem[];
};

function emptyForm(): CreatorForm {
  return {
    bio: '',
    niche: [],
    location: {},
    social: {
      igHandle: '',
      igLink: '',
      igFollowers: '',
      igEngagement: '',
      ytHandle: '',
      ytLink: '',
      ytSubs: '',
      ttHandle: '',
      ttLink: '',
      ttFollowers: '',
    },
    contentTypes: [],
    isUGCOnly: false,
    portfolio: [],
  };
}

/** At least one platform with BOTH a handle and a profile link is submitted. */
function hasOneSocial(f: CreatorForm): boolean {
  const s = f.social;
  return Boolean(
    (s.igHandle.trim() && s.igLink.trim()) ||
      (s.ytHandle.trim() && s.ytLink.trim()) ||
      (s.ttHandle.trim() && s.ttLink.trim()),
  );
}

/** Whether the given 1-based step is complete enough to advance. */
function canAdvance(step: number, f: CreatorForm): boolean {
  switch (step) {
    case 1:
      return f.niche.length >= 1; // pick at least one niche; bio is optional
    case 3:
      // A social handle + link is mandatory (creators are verified on this).
      return hasOneSocial(f);
    default:
      return true;
  }
}

/** Digits-only sanitizer for the follower/subscriber count inputs. */
const digits = (s: string) => s.replace(/[^0-9]/g, '');
const toNum = (s: string) => (s ? Number(s) : 0);

/** Map the form to the `PUT /api/profile/creator` body, dropping empty fields. */
function toPayload(f: CreatorForm) {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };

  const s = f.social;
  // Only include a platform when it has BOTH a handle and a link (the backend
  // requires both); follower/subscriber counts are optional.
  const socialHandles = {
    ...(s.igHandle.trim() && s.igLink.trim()
      ? {
          instagram: {
            handle: s.igHandle.trim(),
            link: s.igLink.trim(),
            ...(s.igFollowers ? { followerCount: toNum(s.igFollowers) } : {}),
            ...(s.igEngagement.trim() ? { engagementRate: Number(s.igEngagement) } : {}),
          },
        }
      : {}),
    ...(s.ytHandle.trim() && s.ytLink.trim()
      ? {
          youtube: {
            handle: s.ytHandle.trim(),
            link: s.ytLink.trim(),
            ...(s.ytSubs ? { subscriberCount: toNum(s.ytSubs) } : {}),
          },
        }
      : {}),
    ...(s.ttHandle.trim() && s.ttLink.trim()
      ? {
          tiktok: {
            handle: s.ttHandle.trim(),
            link: s.ttLink.trim(),
            ...(s.ttFollowers ? { followerCount: toNum(s.ttFollowers) } : {}),
          },
        }
      : {}),
  };

  return {
    ...(f.bio.trim() ? { bio: f.bio.trim() } : {}),
    niche: f.niche,
    ...(Object.keys(trimmedLoc).length ? { location: trimmedLoc } : {}),
    ...(Object.keys(socialHandles).length ? { socialHandles } : {}),
    ...(f.contentTypes.length ? { contentTypes: f.contentTypes } : {}),
    isUGCOnly: f.isUGCOnly,
    portfolio: f.portfolio,
  };
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function CreatorOnboardingScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreatorForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const patch = (partial: Partial<CreatorForm>) => setForm((f) => ({ ...f, ...partial }));
  const setLoc = (partial: Partial<GeoLocation>) => patch({ location: { ...form.location, ...partial } });
  const setSocial = (partial: Partial<CreatorForm['social']>) => patch({ social: { ...form.social, ...partial } });

  const addPortfolioImage = async () => {
    if (form.portfolio.length >= MAX_PORTFOLIO) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage('portfolio', { aspect: [4, 5] });
      if (url) patch({ portfolio: [...form.portfolio, { imageUrl: url }] });
    } catch (err) {
      if (err instanceof ImagePermissionError) setError(err.message);
      else if (isApiError(err)) setError(err.message);
      else setError('Could not upload that image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.put<{ profile: CreatorProfile }>('/profile/creator', toPayload(form));
      if (user) setUser({ ...user, isOnboarded: true } as PublicUser);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save your profile. Please try again.');
      setSubmitting(false);
    }
    // On success the auth gate navigates away; no manual navigation here.
  };

  const onNext = () => {
    if (step < TOTAL_STEPS) {
      setError(null);
      setStep((s) => s + 1);
    } else {
      void submit();
    }
  };
  const onBack = step > 1 ? () => setStep((s) => s - 1) : undefined;

  return (
    <OnboardingShell
      title="Set up your creator profile"
      step={step}
      totalSteps={TOTAL_STEPS}
      stepTitle={STEP_TITLES[step - 1]}
      canAdvance={canAdvance(step, form) && !uploading}
      isLast={step === TOTAL_STEPS}
      submitting={submitting}
      onBack={onBack}
      onNext={onNext}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && <FormBanner message={error} />}

        {step === 1 && (
          <>
            <Field label="Bio (optional)" hint="A short intro brands will read on your profile.">
              <TextArea
                value={form.bio}
                onChangeText={(bio) => patch({ bio })}
                placeholder="e.g. Toronto food + lifestyle creator sharing honest reviews…"
                maxLength={2000}
              />
            </Field>
            <Field label="Your niches" hint="Pick the topics you create about — used to match you with campaigns.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {NICHES.map((n) => (
                  <TagChip key={n} label={n} selected={form.niche.includes(n)} onPress={() => patch({ niche: toggle(form.niche, n) })} />
                ))}
              </View>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 16, lineHeight: 20 }}>
              Where are you based? This helps brands find local creators.
            </Text>
            <Field label="City">
              <AutocompleteField
                value={form.location.city ?? ''}
                onChangeText={(city) => setLoc({ city })}
                onSelect={(city) => {
                  const loc = locationForCity(city);
                  setLoc({ city, state: loc?.state ?? form.location.state, country: loc?.country ?? form.location.country });
                }}
                options={CITY_NAMES}
                placeholder="Start typing your city…"
              />
            </Field>
            <Field label="State / Region">
              <AutocompleteField
                value={form.location.state ?? ''}
                onChangeText={(state) => setLoc({ state })}
                options={REGIONS}
                icon="mappin"
                placeholder="e.g. Ontario"
              />
            </Field>
            <Field label="Country">
              <AutocompleteField
                value={form.location.country ?? ''}
                onChangeText={(country) => setLoc({ country })}
                options={COUNTRIES}
                icon="mappin"
                placeholder="e.g. Canada"
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 16, lineHeight: 20 }}>
              Add at least one platform with your handle and a link to your profile — this is what
              we verify. You can add more than one.
            </Text>

            <SectionLabel>Instagram</SectionLabel>
            <Field label="Handle">
              <TextField value={form.social.igHandle} onChangeText={(igHandle) => setSocial({ igHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
            </Field>
            <Field label="Profile link">
              <TextField value={form.social.igLink} onChangeText={(igLink) => setSocial({ igLink })} placeholder="https://instagram.com/yourhandle" autoCapitalize="none" keyboardType="url" maxLength={2048} />
            </Field>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Followers (optional)">
                  <TextField value={form.social.igFollowers} onChangeText={(v) => setSocial({ igFollowers: digits(v) })} placeholder="0" keyboardType="numeric" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Engagement %">
                  <TextField value={form.social.igEngagement} onChangeText={(v) => setSocial({ igEngagement: v.replace(/[^0-9.]/g, '') })} placeholder="e.g. 3.5" keyboardType="numeric" />
                </Field>
              </View>
            </View>

            <SectionLabel>YouTube</SectionLabel>
            <Field label="Handle">
              <TextField value={form.social.ytHandle} onChangeText={(ytHandle) => setSocial({ ytHandle })} placeholder="Channel name" autoCapitalize="none" maxLength={120} />
            </Field>
            <Field label="Channel link">
              <TextField value={form.social.ytLink} onChangeText={(ytLink) => setSocial({ ytLink })} placeholder="https://youtube.com/@yourchannel" autoCapitalize="none" keyboardType="url" maxLength={2048} />
            </Field>
            <Field label="Subscribers (optional)">
              <TextField value={form.social.ytSubs} onChangeText={(v) => setSocial({ ytSubs: digits(v) })} placeholder="0" keyboardType="numeric" />
            </Field>

            <SectionLabel>TikTok</SectionLabel>
            <Field label="Handle">
              <TextField value={form.social.ttHandle} onChangeText={(ttHandle) => setSocial({ ttHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
            </Field>
            <Field label="Profile link">
              <TextField value={form.social.ttLink} onChangeText={(ttLink) => setSocial({ ttLink })} placeholder="https://tiktok.com/@yourhandle" autoCapitalize="none" keyboardType="url" maxLength={2048} />
            </Field>
            <Field label="Followers (optional)">
              <TextField value={form.social.ttFollowers} onChangeText={(v) => setSocial({ ttFollowers: digits(v) })} placeholder="0" keyboardType="numeric" />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Content types" hint="The formats you create — brands match these to their deliverables.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONTENT_TYPES.map((ct) => (
                  <TagChip key={ct} label={ct} selected={form.contentTypes.includes(ct)} onPress={() => patch({ contentTypes: toggle(form.contentTypes, ct) })} />
                ))}
              </View>
            </Field>
            <SwitchRow
              label="UGC-only creator"
              hint="I create content for brands to use, without needing a large public following."
              value={form.isUGCOnly}
              onValueChange={(isUGCOnly) => patch({ isUGCOnly })}
            />
          </>
        )}

        {step === 5 && (
          <>
            <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 16, lineHeight: 20 }}>
              Show off your best work — up to {MAX_PORTFOLIO} images. Optional, but it helps you get accepted.
            </Text>
            <PortfolioGrid
              items={form.portfolio}
              editable
              onAdd={addPortfolioImage}
              onRemove={(i) => patch({ portfolio: form.portfolio.filter((_, idx) => idx !== i) })}
            />
            {uploading && (
              <Text style={{ fontSize: 13, color: colors.text3, marginTop: 14, textAlign: 'center' }}>Uploading…</Text>
            )}
          </>
        )}

        {step === 6 && <ReviewStep form={form} />}
      </ScrollView>
    </OnboardingShell>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 10, letterSpacing: -0.1 }}>
      {children}
    </Text>
  );
}

function ReviewStep({ form }: { form: CreatorForm }) {
  const { colors } = useTheme();
  const loc = [form.location.city, form.location.state, form.location.country].filter(Boolean).join(', ');
  const platforms = [
    form.social.igHandle.trim() && 'Instagram',
    form.social.ytHandle.trim() && 'YouTube',
    form.social.ttHandle.trim() && 'TikTok',
  ].filter(Boolean) as string[];

  const rows: { label: string; value: string }[] = [
    { label: 'Niches', value: form.niche.length ? form.niche.join(', ') : '—' },
    { label: 'Location', value: loc || 'Not set' },
    { label: 'Platforms', value: platforms.length ? platforms.join(', ') : 'None added' },
    { label: 'Content types', value: form.contentTypes.length ? form.contentTypes.join(', ') : 'Not set' },
    { label: 'UGC-only', value: form.isUGCOnly ? 'Yes' : 'No' },
    { label: 'Portfolio', value: `${form.portfolio.length} image${form.portfolio.length === 1 ? '' : 's'}` },
  ];

  return (
    <View>
      <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 18, lineHeight: 20 }}>
        Looks good? You can edit any of this later from your profile.
      </Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.hair }}>
        {rows.map((r, i) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.hair,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text3, flexShrink: 0 }}>{r.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
