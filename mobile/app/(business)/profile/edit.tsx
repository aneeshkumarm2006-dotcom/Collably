/**
 * Edit business profile (PRD §7.4). A single-scroll form pre-populated from the
 * current profile — logo, name, about, category, location, website, and social
 * links — saved via `PUT /api/profile/business`. Mirrors the onboarding field set
 * so the look is identical; on save it returns to the profile tab.
 */
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useRouter } from 'expo-router';
import { Header } from '@/components/shared';
import { FormBanner } from '@/components/auth';
import { Button, Field, TextField, TextArea, TagChip, Icon, RemoteImage, SkeletonCard, ErrorState } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { CATEGORIES, type Category } from '@/constants';
import type { GeoLocation, BusinessProfile } from '@/types';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';

type Form = {
  businessName: string;
  description: string;
  category: Category | null;
  location: GeoLocation;
  website: string;
  socialLinks: { instagram: string; youtube: string; tiktok: string };
  logo: string | null;
};

function fromProfile(p: BusinessProfile): Form {
  return {
    businessName: p.businessName,
    description: p.description ?? '',
    category: p.category,
    location: { ...p.location },
    website: p.website ?? '',
    socialLinks: {
      instagram: p.socialLinks.instagram ?? '',
      youtube: p.socialLinks.youtube ?? '',
      tiktok: p.socialLinks.tiktok ?? '',
    },
    logo: p.logo ?? null,
  };
}

function toPayload(f: Form) {
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
    description: f.description.trim(),
    location: trimmedLoc,
    ...(f.website.trim() ? { website: f.website.trim() } : {}),
    socialLinks: social,
    logo: f.logo,
  };
}

export default function EditBusinessProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: profile, loading, error, reload } = useFetch(async () => {
    const { data } = await api.get<{ profile: BusinessProfile }>('/profile/business');
    return data.profile;
  }, []);

  if (loading && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Edit profile" onBack={() => router.back()} variant="card" />
        <View style={{ padding: 16 }}>
          <SkeletonCard />
        </View>
      </View>
    );
  }
  if (error || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Edit profile" onBack={() => router.back()} variant="card" />
        <ErrorState body={error ?? 'Could not load your profile.'} onRetry={reload} />
      </View>
    );
  }

  return <EditForm initial={fromProfile(profile)} />;
}

function EditForm({ initial }: { initial: Form }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const setLoc = (p: Partial<GeoLocation>) => patch({ location: { ...form.location, ...p } });
  const setSocial = (p: Partial<Form['socialLinks']>) => patch({ socialLinks: { ...form.socialLinks, ...p } });

  const pickLogo = async () => {
    setFormError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage('logos', { aspect: [1, 1] });
      if (url) patch({ logo: url });
    } catch (err) {
      if (err instanceof ImagePermissionError) setFormError(err.message);
      else if (isApiError(err)) setFormError(err.message);
      else setFormError('Could not upload that image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.businessName.trim()) {
      setFormError('Add your business name.');
      return;
    }
    if (!form.category) {
      setFormError('Pick a category.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await api.put('/profile/business', toPayload(form));
      router.back();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Edit profile" onBack={() => router.back()} variant="card" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {formError && <FormBanner message={formError} />}

        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Pressable
            onPress={uploading ? undefined : pickLogo}
            style={({ pressed }) => ({
              width: 112,
              height: 112,
              borderRadius: 24,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.cardSunk,
              borderWidth: form.logo ? 0 : 1.5,
              borderColor: colors.hairStrong,
              borderStyle: form.logo ? 'solid' : 'dashed',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {uploading ? (
              <ActivityIndicator color={colors.accent} />
            ) : form.logo ? (
              <RemoteImage source={{ uri: form.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" recyclingKey={form.logo} />
            ) : (
              <>
                <Icon name="camera" size={26} color={colors.text3} strokeWidth={1.8} />
                <Text style={{ fontSize: 12, color: colors.text3, marginTop: 6 }}>Logo</Text>
              </>
            )}
          </Pressable>
          {form.logo && !uploading && (
            <View style={{ marginTop: 10 }}>
              <Button variant="ghost" size="sm" icon="refresh" onPress={pickLogo}>
                Replace logo
              </Button>
            </View>
          )}
        </View>

        <Field label="Business name">
          <TextField value={form.businessName} onChangeText={(businessName) => patch({ businessName })} placeholder="e.g. Bloom Café" autoCapitalize="words" maxLength={160} />
        </Field>

        <Field label="About" hint="A short intro creators will read on your profile.">
          <TextArea value={form.description} onChangeText={(description) => patch({ description })} placeholder="Tell creators who you are…" maxLength={2000} />
        </Field>

        <Field label="Category">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <TagChip key={c} label={c} selected={form.category === c} onPress={() => patch({ category: c })} />
            ))}
          </View>
        </Field>

        <SectionLabel colors={colors}>Location</SectionLabel>
        <Field label="City">
          <TextField value={form.location.city ?? ''} onChangeText={(city) => setLoc({ city })} placeholder="e.g. Toronto" autoCapitalize="words" />
        </Field>
        <Field label="State / Region">
          <TextField value={form.location.state ?? ''} onChangeText={(state) => setLoc({ state })} placeholder="e.g. Ontario" autoCapitalize="words" />
        </Field>
        <Field label="Country">
          <TextField value={form.location.country ?? ''} onChangeText={(country) => setLoc({ country })} placeholder="e.g. Canada" autoCapitalize="words" />
        </Field>
        <Field label="Website">
          <TextField value={form.website} onChangeText={(website) => patch({ website })} placeholder="https://yourbrand.com" keyboardType="url" autoCapitalize="none" maxLength={2048} />
        </Field>

        <SectionLabel colors={colors}>Social links</SectionLabel>
        <Field label="Instagram">
          <TextField value={form.socialLinks.instagram} onChangeText={(instagram) => setSocial({ instagram })} placeholder="@yourbrand or profile URL" autoCapitalize="none" maxLength={200} />
        </Field>
        <Field label="YouTube">
          <TextField value={form.socialLinks.youtube} onChangeText={(youtube) => setSocial({ youtube })} placeholder="Channel URL" autoCapitalize="none" maxLength={200} />
        </Field>
        <Field label="TikTok">
          <TextField value={form.socialLinks.tiktok} onChangeText={(tiktok) => setSocial({ tiktok })} placeholder="@yourbrand or profile URL" autoCapitalize="none" maxLength={200} />
        </Field>

        <View style={{ marginTop: 24 }}>
          <Button block loading={saving} disabled={uploading} onPress={save}>
            Save changes
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ colors, children }: { colors: ReturnType<typeof useTheme>['colors']; children: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 10, letterSpacing: -0.1 }}>
      {children}
    </Text>
  );
}
