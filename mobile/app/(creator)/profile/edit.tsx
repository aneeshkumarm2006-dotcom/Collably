/**
 * Edit creator profile (PRD §7.3). A single-scroll form pre-populated from the
 * current profile — bio, niches, location, socials, content types, UGC toggle, and
 * the portfolio grid — saved via `PUT /api/profile/creator`. Mirrors the onboarding
 * field set so the look is identical; on save it returns to the profile tab.
 */
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/shared';
import { FormBanner } from '@/components/auth';
import { PortfolioGrid } from '@/components/creator';
import { Button, Field, TextField, TextArea, SwitchRow, TagChip, SkeletonCard, ErrorState } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { NICHES, CONTENT_TYPES, type Niche, type ContentType } from '@/constants';
import type { GeoLocation, PortfolioItem, CreatorProfile } from '@/types';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';

const MAX_PORTFOLIO = 6;

type Form = {
  bio: string;
  niche: Niche[];
  location: GeoLocation;
  social: {
    igHandle: string;
    igLink: string;
    ytHandle: string;
    ytLink: string;
    ttHandle: string;
    ttLink: string;
  };
  contentTypes: ContentType[];
  isUGCOnly: boolean;
  portfolio: PortfolioItem[];
};

function fromProfile(p: CreatorProfile): Form {
  const s = p.socialHandles;
  return {
    bio: p.bio ?? '',
    niche: [...p.niche],
    location: { ...p.location },
    social: {
      igHandle: s.instagram?.handle ?? '',
      igLink: s.instagram?.link ?? '',
      ytHandle: s.youtube?.handle ?? '',
      ytLink: s.youtube?.link ?? '',
      ttHandle: s.tiktok?.handle ?? '',
      ttLink: s.tiktok?.link ?? '',
    },
    contentTypes: [...p.contentTypes],
    isUGCOnly: p.isUGCOnly,
    portfolio: [...p.portfolio],
  };
}

/** At least one platform with BOTH a handle and a profile link. */
function hasOneSocial(f: Form): boolean {
  const s = f.social;
  return Boolean(
    (s.igHandle.trim() && s.igLink.trim()) ||
      (s.ytHandle.trim() && s.ytLink.trim()) ||
      (s.ttHandle.trim() && s.ttLink.trim()),
  );
}

function toPayload(f: Form) {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };
  const s = f.social;
  // Only include a platform when it has BOTH a handle and a link. Follower counts
  // are NOT self-reported — Instagram's verified count is set by the DM-code flow.
  const socialHandles = {
    ...(s.igHandle.trim() && s.igLink.trim()
      ? { instagram: { handle: s.igHandle.trim(), link: s.igLink.trim() } }
      : {}),
    ...(s.ytHandle.trim() && s.ytLink.trim()
      ? { youtube: { handle: s.ytHandle.trim(), link: s.ytLink.trim() } }
      : {}),
    ...(s.ttHandle.trim() && s.ttLink.trim()
      ? { tiktok: { handle: s.ttHandle.trim(), link: s.ttLink.trim() } }
      : {}),
  };
  return {
    bio: f.bio.trim(),
    niche: f.niche,
    location: trimmedLoc,
    socialHandles,
    contentTypes: f.contentTypes,
    isUGCOnly: f.isUGCOnly,
    portfolio: f.portfolio,
  };
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function EditCreatorProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: profile, loading, error, reload } = useFetch(async () => {
    const { data } = await api.get<{ profile: CreatorProfile }>('/profile/creator');
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
  const setSocial = (p: Partial<Form['social']>) => patch({ social: { ...form.social, ...p } });

  const addImage = async () => {
    if (form.portfolio.length >= MAX_PORTFOLIO) return;
    setFormError(null);
    setUploading(true);
    try {
      // Free-form crop so portrait portfolio shots keep their full frame.
      const url = await pickAndUploadImage('portfolio');
      if (url) patch({ portfolio: [...form.portfolio, { imageUrl: url }] });
    } catch (err) {
      if (err instanceof ImagePermissionError) setFormError(err.message);
      else if (isApiError(err)) setFormError(err.message);
      else setFormError('Could not upload that image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (form.niche.length < 1) {
      setFormError('Pick at least one niche.');
      return;
    }
    if (!hasOneSocial(form)) {
      setFormError('Add at least one social handle (Instagram, TikTok or YouTube) with its link.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await api.put('/profile/creator', toPayload(form));
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

        <Field label="Bio" hint="A short intro brands will read on your profile.">
          <TextArea value={form.bio} onChangeText={(bio) => patch({ bio })} placeholder="Tell brands about yourself…" maxLength={2000} />
        </Field>

        <Field label="Niches" hint="Pick the topics you create about.">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NICHES.map((n) => (
              <TagChip key={n} label={n} selected={form.niche.includes(n)} onPress={() => patch({ niche: toggle(form.niche, n) })} />
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

        <Text style={{ fontSize: 13, color: colors.text2, marginTop: 6, marginBottom: 2, lineHeight: 18 }}>
          At least one platform with a handle and a profile link is required. This is what we verify.
        </Text>

        <SectionLabel colors={colors}>Instagram</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.igHandle} onChangeText={(igHandle) => setSocial({ igHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
        </Field>
        <Field label="Profile link">
          <TextField value={form.social.igLink} onChangeText={(igLink) => setSocial({ igLink })} placeholder="https://instagram.com/yourhandle" autoCapitalize="none" keyboardType="url" maxLength={2048} />
        </Field>

        <SectionLabel colors={colors}>YouTube</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.ytHandle} onChangeText={(ytHandle) => setSocial({ ytHandle })} placeholder="Channel name" autoCapitalize="none" maxLength={120} />
        </Field>
        <Field label="Channel link">
          <TextField value={form.social.ytLink} onChangeText={(ytLink) => setSocial({ ytLink })} placeholder="https://youtube.com/@yourchannel" autoCapitalize="none" keyboardType="url" maxLength={2048} />
        </Field>

        <SectionLabel colors={colors}>TikTok</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.ttHandle} onChangeText={(ttHandle) => setSocial({ ttHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
        </Field>
        <Field label="Profile link">
          <TextField value={form.social.ttLink} onChangeText={(ttLink) => setSocial({ ttLink })} placeholder="https://tiktok.com/@yourhandle" autoCapitalize="none" keyboardType="url" maxLength={2048} />
        </Field>

        <SectionLabel colors={colors}>Content</SectionLabel>
        <Field label="Content types">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTENT_TYPES.map((ct) => (
              <TagChip key={ct} label={ct} selected={form.contentTypes.includes(ct)} onPress={() => patch({ contentTypes: toggle(form.contentTypes, ct) })} />
            ))}
          </View>
        </Field>
        <View style={{ marginBottom: 16 }}>
          <SwitchRow
            label="UGC-only creator"
            hint="I create content for brands to use, without needing a large public following."
            value={form.isUGCOnly}
            onValueChange={(isUGCOnly) => patch({ isUGCOnly })}
          />
        </View>

        <SectionLabel colors={colors}>Portfolio</SectionLabel>
        <PortfolioGrid
          items={form.portfolio}
          editable
          onAdd={addImage}
          onRemove={(i) => patch({ portfolio: form.portfolio.filter((_, idx) => idx !== i) })}
        />
        {uploading && <Text style={{ fontSize: 13, color: colors.text3, marginTop: 12, textAlign: 'center' }}>Uploading…</Text>}

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
