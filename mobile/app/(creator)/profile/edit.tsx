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
const digits = (s: string) => s.replace(/[^0-9]/g, '');
const toNum = (s: string) => (s ? Number(s) : 0);

type Form = {
  bio: string;
  niche: Niche[];
  location: GeoLocation;
  social: {
    igHandle: string;
    igFollowers: string;
    igEngagement: string;
    ytHandle: string;
    ytSubs: string;
    ttHandle: string;
    ttFollowers: string;
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
      igFollowers: s.instagram ? String(s.instagram.followerCount) : '',
      igEngagement: s.instagram?.engagementRate != null ? String(s.instagram.engagementRate) : '',
      ytHandle: s.youtube?.handle ?? '',
      ytSubs: s.youtube ? String(s.youtube.subscriberCount) : '',
      ttHandle: s.tiktok?.handle ?? '',
      ttFollowers: s.tiktok ? String(s.tiktok.followerCount) : '',
    },
    contentTypes: [...p.contentTypes],
    isUGCOnly: p.isUGCOnly,
    portfolio: [...p.portfolio],
  };
}

function toPayload(f: Form) {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };
  const s = f.social;
  const socialHandles = {
    ...(s.igHandle.trim()
      ? {
          instagram: {
            handle: s.igHandle.trim(),
            followerCount: toNum(s.igFollowers),
            ...(s.igEngagement.trim() ? { engagementRate: Number(s.igEngagement) } : {}),
          },
        }
      : {}),
    ...(s.ytHandle.trim() ? { youtube: { handle: s.ytHandle.trim(), subscriberCount: toNum(s.ytSubs) } } : {}),
    ...(s.ttHandle.trim() ? { tiktok: { handle: s.ttHandle.trim(), followerCount: toNum(s.ttFollowers) } } : {}),
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
      const url = await pickAndUploadImage('portfolio', { aspect: [4, 5] });
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

        <SectionLabel colors={colors}>Instagram</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.igHandle} onChangeText={(igHandle) => setSocial({ igHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
        </Field>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Followers">
              <TextField value={form.social.igFollowers} onChangeText={(v) => setSocial({ igFollowers: digits(v) })} placeholder="0" keyboardType="numeric" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Engagement %">
              <TextField value={form.social.igEngagement} onChangeText={(v) => setSocial({ igEngagement: v.replace(/[^0-9.]/g, '') })} placeholder="e.g. 3.5" keyboardType="numeric" />
            </Field>
          </View>
        </View>

        <SectionLabel colors={colors}>YouTube</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.ytHandle} onChangeText={(ytHandle) => setSocial({ ytHandle })} placeholder="Channel name" autoCapitalize="none" maxLength={120} />
        </Field>
        <Field label="Subscribers">
          <TextField value={form.social.ytSubs} onChangeText={(v) => setSocial({ ytSubs: digits(v) })} placeholder="0" keyboardType="numeric" />
        </Field>

        <SectionLabel colors={colors}>TikTok</SectionLabel>
        <Field label="Handle">
          <TextField value={form.social.ttHandle} onChangeText={(ttHandle) => setSocial({ ttHandle })} placeholder="@yourhandle" autoCapitalize="none" maxLength={120} />
        </Field>
        <Field label="Followers">
          <TextField value={form.social.ttFollowers} onChangeText={(v) => setSocial({ ttFollowers: digits(v) })} placeholder="0" keyboardType="numeric" />
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
