/**
 * Business onboarding (PRD §7.2). A single screen with internal step state and a
 * progress stepper — no exit until complete (the `(onboarding)` stack disables the
 * back gesture; the gate keeps the user here until `isOnboarded` flips).
 *
 * 5 steps: basics + category → location + website → social links → logo upload
 * (→ Cloudinary) → review & finish. Finishing upserts the profile via
 * `PUT /api/profile/business`, which marks the User onboarded server-side; we
 * mirror that into the auth store so the root gate routes to the business home.
 */
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { OnboardingShell } from '@/components/onboarding';
import { FormBanner } from '@/components/auth';
import { Field, TextField, TextArea, TagChip, Icon, Button, RemoteImage, AutocompleteField } from '@/components/ui';
import { COUNTRIES, REGIONS, CITY_NAMES, locationForCity } from '@/lib/locations';
import { useTheme } from '@/components/ThemeProvider';
import { CATEGORIES, type Category } from '@/constants';
import type { GeoLocation, PublicUser, BusinessProfile } from '@/types';
import { api, isApiError } from '@/lib/api';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useAuthStore } from '@/store/authStore';

const TOTAL_STEPS = 5;
const STEP_TITLES = ['Basics', 'Location', 'Socials', 'Logo', 'Review'];

type BusinessForm = {
  businessName: string;
  description: string;
  category: Category | null;
  location: GeoLocation;
  website: string;
  socialLinks: { instagram: string; youtube: string; tiktok: string };
  logo: string | null;
};

function emptyForm(name: string): BusinessForm {
  return {
    businessName: name ?? '',
    description: '',
    category: null,
    location: {},
    website: '',
    socialLinks: { instagram: '', youtube: '', tiktok: '' },
    logo: null,
  };
}

/** Whether the given 1-based step is complete enough to advance. */
function canAdvance(step: number, f: BusinessForm): boolean {
  switch (step) {
    case 1:
      return f.businessName.trim().length >= 1 && !!f.category;
    default:
      return true; // location, socials, logo, review are all optional/terminal
  }
}

/** Map the form to the `PUT /api/profile/business` body, dropping empty fields. */
function toPayload(f: BusinessForm) {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };
  const social = {
    ...(f.socialLinks.instagram.trim() ? { instagram: f.socialLinks.instagram.trim() } : {}),
    ...(f.socialLinks.youtube.trim() ? { youtube: f.socialLinks.youtube.trim() } : {}),
    ...(f.socialLinks.tiktok.trim() ? { tiktok: f.socialLinks.tiktok.trim() } : {}),
  };
  return {
    businessName: f.businessName.trim(),
    category: f.category,
    ...(f.description.trim() ? { description: f.description.trim() } : {}),
    ...(Object.keys(trimmedLoc).length ? { location: trimmedLoc } : {}),
    ...(f.website.trim() ? { website: f.website.trim() } : {}),
    ...(Object.keys(social).length ? { socialLinks: social } : {}),
    ...(f.logo ? { logo: f.logo } : {}),
  };
}

export default function BusinessOnboardingScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BusinessForm>(() => emptyForm(user?.name ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const patch = (partial: Partial<BusinessForm>) => setForm((f) => ({ ...f, ...partial }));
  const setLoc = (partial: Partial<GeoLocation>) => patch({ location: { ...form.location, ...partial } });
  const setSocial = (partial: Partial<BusinessForm['socialLinks']>) =>
    patch({ socialLinks: { ...form.socialLinks, ...partial } });

  const pickLogo = async () => {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage('logos', { aspect: [1, 1] });
      if (url) patch({ logo: url });
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
      await api.put<{ profile: BusinessProfile }>('/profile/business', toPayload(form));
      // Backend flips isOnboarded server-side; mirror it so the gate routes home.
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
      title="Set up your business"
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
            <Field label="Business name" hint="The brand creators will see.">
              <TextField
                value={form.businessName}
                onChangeText={(businessName) => patch({ businessName })}
                placeholder="e.g. Bloom Café"
                autoCapitalize="words"
                maxLength={160}
              />
            </Field>
            <Field label="About (optional)" hint="A short intro to your brand and what you're after.">
              <TextArea
                value={form.description}
                onChangeText={(description) => patch({ description })}
                placeholder="Tell creators who you are and the kind of collabs you run…"
                maxLength={2000}
              />
            </Field>
            <Field label="Category">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <TagChip key={c} label={c} selected={form.category === c} onPress={() => patch({ category: c })} />
                ))}
              </View>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
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
                placeholder="e.g. Karnataka"
              />
            </Field>
            <Field label="Country">
              <AutocompleteField
                value={form.location.country ?? ''}
                onChangeText={(country) => setLoc({ country })}
                options={COUNTRIES}
                icon="mappin"
                placeholder="e.g. India"
              />
            </Field>
            <Field label="Website (optional)">
              <TextField
                value={form.website}
                onChangeText={(website) => patch({ website })}
                placeholder="https://yourbrand.com"
                keyboardType="url"
                autoCapitalize="none"
                maxLength={2048}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 16, lineHeight: 20 }}>
              Link your social profiles so creators can see your brand. All optional.
            </Text>
            <Field label="Instagram">
              <TextField
                value={form.socialLinks.instagram}
                onChangeText={(instagram) => setSocial({ instagram })}
                placeholder="@yourbrand or profile URL"
                autoCapitalize="none"
                maxLength={200}
              />
            </Field>
            <Field label="YouTube">
              <TextField
                value={form.socialLinks.youtube}
                onChangeText={(youtube) => setSocial({ youtube })}
                placeholder="Channel URL"
                autoCapitalize="none"
                maxLength={200}
              />
            </Field>
            <Field label="TikTok">
              <TextField
                value={form.socialLinks.tiktok}
                onChangeText={(tiktok) => setSocial({ tiktok })}
                placeholder="@yourbrand or profile URL"
                autoCapitalize="none"
                maxLength={200}
              />
            </Field>
          </>
        )}

        {step === 4 && <LogoStep logo={form.logo} uploading={uploading} onPick={pickLogo} onClear={() => patch({ logo: null })} />}

        {step === 5 && <ReviewStep form={form} />}
      </ScrollView>
    </OnboardingShell>
  );
}

function LogoStep({
  logo,
  uploading,
  onPick,
  onClear,
}: {
  logo: string | null;
  uploading: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 20, textAlign: 'center', lineHeight: 20 }}>
        Add a logo so your campaigns stand out. You can skip this and add one later.
      </Text>

      <Pressable
        onPress={uploading ? undefined : onPick}
        style={({ pressed }) => ({
          width: 140,
          height: 140,
          borderRadius: 28,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cardSunk,
          borderWidth: logo ? 0 : 1.5,
          borderColor: colors.hairStrong,
          borderStyle: logo ? 'solid' : 'dashed',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {uploading ? (
          <ActivityIndicator color={colors.accent} />
        ) : logo ? (
          <RemoteImage source={{ uri: logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} recyclingKey={logo} />
        ) : (
          <>
            <Icon name="camera" size={28} color={colors.text3} strokeWidth={1.8} />
            <Text style={{ fontSize: 12.5, color: colors.text3, marginTop: 8 }}>Upload logo</Text>
          </>
        )}
      </Pressable>

      {logo && !uploading && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button variant="tonal" size="sm" icon="refresh" onPress={onPick}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" icon="trash" onPress={onClear}>
            Remove
          </Button>
        </View>
      )}
    </View>
  );
}

function ReviewStep({ form }: { form: BusinessForm }) {
  const { colors } = useTheme();
  const loc = [form.location.city, form.location.state, form.location.country].filter(Boolean).join(', ');
  const rows: { label: string; value: string }[] = [
    { label: 'Business', value: form.businessName.trim() || '—' },
    { label: 'Category', value: form.category ?? '—' },
    { label: 'Location', value: loc || 'Not set' },
    { label: 'Website', value: form.website.trim() || 'Not set' },
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
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.hair,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text3 }}>{r.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: '60%', textAlign: 'right' }} numberOfLines={1}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
