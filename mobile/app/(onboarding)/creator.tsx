/**
 * Creator onboarding (PRD §7.2) — immersive "story panel" redesign (Direction C).
 * Instead of a stepper form, each question is a full-screen cinematic panel over a
 * Ken-Burns gradient: niche/format tiles you tap to "like", a map-ish location
 * step, focused social inputs, a portfolio uploader, and a confetti reveal. No
 * progress-bar-and-fields form anywhere.
 *
 * The presentation is new; the data model, validation, payload mapping and submit
 * are unchanged — finishing still upserts via `PUT /api/profile/creator`, which
 * marks the User onboarded server-side; we mirror that into the auth store so the
 * root gate routes to the creator home. No exit until complete.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '@/components/ui/SafePressable';
import { Icon, RemoteImage, type IconName } from '@/components/ui';
import {
  ChoiceTile,
  SelectChip,
  NextPill,
  SkipLink,
  StoryInput,
  StoryAutocomplete,
  StoryOnboarding,
  StoryPanel,
  WelcomeDeck,
  optionVisual,
  useTileWidth,
  type Grad,
} from '@/components/onboarding';
import { CITY_NAMES, REGIONS, COUNTRIES, locationForCity } from '@/lib/locations';
import { NICHES, CONTENT_TYPES, type Niche, type ContentType } from '@/constants';
import type { GeoLocation, PortfolioItem, PublicUser, CreatorProfile } from '@/types';
import { api, isApiError } from '@/lib/api';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useAuthStore } from '@/store/authStore';

const MAX_PORTFOLIO = 6;

// Panel order. `reveal` is the celebratory finish.
const PANELS = ['welcome', 'niche', 'content', 'ugc', 'location', 'socials', 'bio', 'portfolio', 'reveal'] as const;
const TOTAL = PANELS.length;
const REVEAL = TOTAL - 1;

// One consistent blue-black cinematic ground across every panel (approved
// redesign): a blue-biased near-black with the Meta-blue glow at the top, so the
// whole flow reads as one system instead of shifting colour per step. The reveal
// keeps a brighter blue to feel celebratory. Ken-Burns adds subtle ambient drift.
const GROUND: Grad = ['#16233F', '#0B0C11'];
const PANEL_BG: Grad[] = [
  GROUND, // welcome
  GROUND, // niche
  GROUND, // content
  GROUND, // ugc
  GROUND, // location
  GROUND, // socials
  GROUND, // bio
  GROUND, // portfolio
  ['#0A3DC9', '#05122E'], // reveal — brighter blue for the finish
];

type CreatorForm = {
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

function emptyForm(): CreatorForm {
  return {
    bio: '',
    niche: [],
    location: {},
    social: {
      igHandle: '',
      igLink: '',
      ytHandle: '',
      ytLink: '',
      ttHandle: '',
      ttLink: '',
    },
    contentTypes: [],
    isUGCOnly: false,
    portfolio: [],
  };
}

/**
 * A profile link must point at an actual profile, not just a bare domain — a
 * link like "instagram.com" can't be verified, so we require a non-empty path
 * after the host (e.g. instagram.com/yourhandle). Scheme stays optional.
 */
const looksLikeUrl = (s: string) => /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}\/\S+$/i.test(s.trim());
/** Add https:// when the user omitted the scheme, so the backend stores a real URL. */
const normalizeUrl = (s: string) => {
  const t = s.trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
};
/** A platform counts only when it has a handle AND a valid profile link. */
const platformValid = (handle: string, link: string) => Boolean(handle.trim() && looksLikeUrl(link));
/** The user has started a platform (so we can warn if its link is missing/invalid). */
const platformStarted = (handle: string, link: string) => Boolean(handle.trim() || link.trim());

/** At least one platform with a handle AND a valid profile link is submitted. */
function hasOneSocial(f: CreatorForm): boolean {
  const s = f.social;
  return (
    platformValid(s.igHandle, s.igLink) ||
    platformValid(s.ytHandle, s.ytLink) ||
    platformValid(s.ttHandle, s.ttLink)
  );
}


/** Map the form to the `PUT /api/profile/creator` body, dropping empty fields. */
function toPayload(f: CreatorForm) {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };

  const s = f.social;
  // Only include a platform when it's valid (handle + real URL); normalize links.
  // Follower/engagement counts are NOT self-reported anymore — they'd be unverifiable
  // and gameable. The authoritative follower count comes from Instagram verification.
  const socialHandles = {
    ...(platformValid(s.igHandle, s.igLink)
      ? { instagram: { handle: s.igHandle.trim(), link: normalizeUrl(s.igLink) } }
      : {}),
    ...(platformValid(s.ytHandle, s.ytLink)
      ? { youtube: { handle: s.ytHandle.trim(), link: normalizeUrl(s.ytLink) } }
      : {}),
    ...(platformValid(s.ttHandle, s.ttLink)
      ? { tiktok: { handle: s.ttHandle.trim(), link: normalizeUrl(s.ttLink) } }
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

export default function CreatorOnboardingScreen({ initialIndex = 0 }: { initialIndex?: number }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [index, setIndex] = useState(initialIndex);
  const [form, setForm] = useState<CreatorForm>(emptyForm);
  const [ugcPick, setUgcPick] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const firstName = (user?.name ?? '').split(' ')[0];
  const tileW = useTileWidth();

  const patch = (partial: Partial<CreatorForm>) => setForm((f) => ({ ...f, ...partial }));
  const setLoc = (partial: Partial<GeoLocation>) => patch({ location: { ...form.location, ...partial } });
  const setSocial = (partial: Partial<CreatorForm['social']>) => patch({ social: { ...form.social, ...partial } });

  const next = () => {
    setError(null);
    setIndex((i) => Math.min(i + 1, TOTAL - 1));
  };
  const back = () => {
    setError(null);
    setIndex((i) => Math.max(i - 1, 0));
  };

  // Leaving the socials step: make the creator pause on their handles. These are
  // what we verify against, so a typo here means they simply can't be verified —
  // cheaper to catch now than to have them wonder why verification never lands.
  const confirmSocials = () => {
    setShowConfirm(true);
  };

  // Auto-advance after a UGC pick; track the timer so it's cleared on unmount.
  const ugcTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { if (ugcTimer.current) clearTimeout(ugcTimer.current); }, []);
  const chooseUGC = (val: boolean) => {
    patch({ isUGCOnly: val });
    setUgcPick(val ? 'yes' : 'no');
    if (ugcTimer.current) clearTimeout(ugcTimer.current);
    ugcTimer.current = setTimeout(next, 340); // let the tile pop before advancing
  };

  // Picking a city from the suggestions auto-fills its state + country.
  const selectCity = (city: string) => {
    const loc = locationForCity(city);
    setLoc({ city, state: loc?.state ?? form.location.state, country: loc?.country ?? form.location.country });
  };

  const addPortfolioImage = async () => {
    if (form.portfolio.length >= MAX_PORTFOLIO) return;
    setError(null);
    setUploading(true);
    try {
      // Free-form crop so portrait portfolio shots keep their full frame.
      const url = await pickAndUploadImage('portfolio');
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
    // The backend requires ≥1 social platform; guard here so we never send an
    // invalid payload (which returned a cryptic "Validation failed"). Send the
    // user back to the socials step with a clear message instead.
    if (!hasOneSocial(form)) {
      setError('Add at least one platform with a handle and a valid profile link before going live.');
      setIndex(PANELS.indexOf('socials'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.put<{ profile: CreatorProfile }>('/profile/creator', toPayload(form));
      if (user) {
        setUser({ ...user, isOnboarded: true } as PublicUser); // gate navigates away
      } else {
        // No session to flip — don't leave the button stuck on "Please wait…".
        setError('Your session expired. Please sign in again.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save your profile. Please try again.');
      setSubmitting(false);
    }
    // On success the auth gate navigates away; no manual navigation here.
  };

  return (
    <StoryOnboarding
      index={index}
      total={TOTAL}
      gradient={PANEL_BG[index]}
      onBack={index > 0 ? back : undefined}
      celebrate={index === REVEAL}
    >
      {renderPanel()}
      <ConfirmHandlesCard
        visible={showConfirm}
        onCheck={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          next();
        }}
      />
    </StoryOnboarding>
  );

  function renderPanel() {
    switch (PANELS[index]) {
      case 'welcome':
        return (
          <StoryPanel
            title={`Welcome${firstName ? `, ${firstName}` : ''}`}
            subtitle="Let's build a creator profile brands will love. Takes about a minute."
            scroll={false}
            footer={<NextPill label="Let's go" onPress={next} />}
          >
            <WelcomeDeck name={firstName} />
          </StoryPanel>
        );

      case 'niche':
        return (
          <StoryPanel
            title="What do you create?"
            subtitle="Tap the topics you post about. Brands match collabs to these."
            footer={<NextPill label="Continue" count={form.niche.length} onPress={next} disabled={form.niche.length < 1} />}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {NICHES.map((n) => (
                <SelectChip
                  key={n}
                  label={n}
                  icon={optionVisual(n).icon}
                  selected={form.niche.includes(n)}
                  onPress={() => patch({ niche: toggle(form.niche, n) })}
                />
              ))}
            </View>
          </StoryPanel>
        );

      case 'content':
        return (
          <StoryPanel
            title="What formats do you make?"
            subtitle="The content types brands match to their deliverables."
            footer={
              <View style={{ gap: 6 }}>
                <NextPill label="Continue" count={form.contentTypes.length} onPress={next} />
                <SkipLink onPress={next} />
              </View>
            }
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {CONTENT_TYPES.map((ct) => (
                <SelectChip
                  key={ct}
                  label={ct}
                  icon={optionVisual(ct).icon}
                  selected={form.contentTypes.includes(ct)}
                  onPress={() => patch({ contentTypes: toggle(form.contentTypes, ct) })}
                />
              ))}
            </View>
          </StoryPanel>
        );

      case 'ugc':
        return (
          <StoryPanel title="Are you a UGC creator?" subtitle="UGC creators make content for brands to post. No big public following needed." scroll={false}>
            <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
              <ChoiceTile
                width="100%"
                height={120}
                label="Yes, I make UGC for brands"
                icon="phone"
                colors={['#16C79A', '#0A7B68']}
                selected={ugcPick === 'yes'}
                onPress={() => chooseUGC(true)}
              />
              <ChoiceTile
                width="100%"
                height={120}
                label="No, I post on my own channels"
                icon="users"
                colors={['#2D88FF', '#0A3DC9']}
                selected={ugcPick === 'no'}
                onPress={() => chooseUGC(false)}
              />
            </View>
          </StoryPanel>
        );

      case 'location':
        return (
          <StoryPanel
            title="Where are you based?"
            subtitle="So brands can find creators near them."
            footer={
              <View style={{ gap: 6 }}>
                <NextPill label="Continue" onPress={next} />
                <SkipLink onPress={next} />
              </View>
            }
          >
            <StoryAutocomplete
              label="City"
              value={form.location.city ?? ''}
              options={CITY_NAMES}
              placeholder="e.g. Toronto"
              onChangeText={(city) => setLoc({ city })}
              onSelect={selectCity}
            />
            <StoryAutocomplete
              label="State / Region"
              value={form.location.state ?? ''}
              options={REGIONS}
              placeholder="e.g. Ontario"
              onChangeText={(state) => setLoc({ state })}
              onSelect={(state) => setLoc({ state })}
            />
            <StoryAutocomplete
              label="Country"
              value={form.location.country ?? ''}
              options={COUNTRIES}
              placeholder="e.g. Canada"
              onChangeText={(country) => setLoc({ country })}
              onSelect={(country) => setLoc({ country })}
            />
          </StoryPanel>
        );

      case 'socials':
        return (
          <StoryPanel
            title="Where can brands find you?"
            subtitle="Connect the platforms you post on. We verify these so brands trust your reach."
            footer={<NextPill label="Continue" onPress={confirmSocials} disabled={!hasOneSocial(form)} />}
          >
            <SocialCard icon="instagram" badge={['#F9CE34', '#EE2A7B', '#6228D7']} name="Instagram" sub="Photos, Reels & Stories" complete={platformValid(form.social.igHandle, form.social.igLink)}>
              <StoryInput label="Handle" value={form.social.igHandle} placeholder="@yourhandle" maxLength={120} onChangeText={(igHandle) => setSocial({ igHandle })} />
              <StoryInput label="Profile link" value={form.social.igLink} placeholder="https://instagram.com/yourhandle" keyboardType="url" maxLength={2048} valid={looksLikeUrl(form.social.igLink)} onChangeText={(igLink) => setSocial({ igLink })} />
              <LinkHint show={platformStarted(form.social.igHandle, form.social.igLink) && !platformValid(form.social.igHandle, form.social.igLink)} platform="instagram.com/you" />
            </SocialCard>

            <SocialCard icon="youtube" badge={['#FF0000', '#C40000']} name="YouTube" sub="Long videos & Shorts" complete={platformValid(form.social.ytHandle, form.social.ytLink)}>
              <StoryInput label="Handle" value={form.social.ytHandle} placeholder="Channel name" maxLength={120} onChangeText={(ytHandle) => setSocial({ ytHandle })} />
              <StoryInput label="Channel link" value={form.social.ytLink} placeholder="https://youtube.com/@yourchannel" keyboardType="url" maxLength={2048} valid={looksLikeUrl(form.social.ytLink)} onChangeText={(ytLink) => setSocial({ ytLink })} />
              <LinkHint show={platformStarted(form.social.ytHandle, form.social.ytLink) && !platformValid(form.social.ytHandle, form.social.ytLink)} platform="youtube.com/@you" />
            </SocialCard>

            <SocialCard icon="music" badge={['#25F4EE', '#000000', '#FE2C55']} name="TikTok" sub="Short-form video" complete={platformValid(form.social.ttHandle, form.social.ttLink)}>
              <StoryInput label="Handle" value={form.social.ttHandle} placeholder="@yourhandle" maxLength={120} onChangeText={(ttHandle) => setSocial({ ttHandle })} />
              <StoryInput label="Profile link" value={form.social.ttLink} placeholder="https://tiktok.com/@yourhandle" keyboardType="url" maxLength={2048} valid={looksLikeUrl(form.social.ttLink)} onChangeText={(ttLink) => setSocial({ ttLink })} />
              <LinkHint show={platformStarted(form.social.ttHandle, form.social.ttLink) && !platformValid(form.social.ttHandle, form.social.ttLink)} platform="tiktok.com/@you" />
            </SocialCard>
          </StoryPanel>
        );

      case 'bio':
        return (
          <StoryPanel
            title="Add a short bio"
            subtitle="A line or two brands will read on your profile. Optional."
            footer={
              <View style={{ gap: 6 }}>
                <NextPill label="Continue" onPress={next} />
                <SkipLink onPress={next} />
              </View>
            }
          >
            <StoryInput
              multiline
              value={form.bio}
              autoCapitalize="sentences"
              placeholder="e.g. Toronto food + lifestyle creator sharing honest reviews…"
              maxLength={2000}
              onChangeText={(bio) => patch({ bio })}
            />
          </StoryPanel>
        );

      case 'portfolio':
        return (
          <StoryPanel
            title="Show your best work"
            subtitle={`Up to ${MAX_PORTFOLIO} images. Optional, but it helps you get accepted.`}
            footer={
              <View style={{ gap: 6 }}>
                <NextPill label="Continue" onPress={next} />
                <SkipLink onPress={next} />
              </View>
            }
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {form.portfolio.map((it, i) => (
                <View key={`${it.imageUrl}-${i}`} style={{ width: tileW, height: tileW * 1.2, borderRadius: 16, overflow: 'hidden' }}>
                  <RemoteImage source={{ uri: it.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" recyclingKey={it.imageUrl} />
                  <Pressable
                    onPress={() => patch({ portfolio: form.portfolio.filter((_, idx) => idx !== i) })}
                    style={{ position: 'absolute', top: 7, right: 7, width: 26, height: 26, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="x" size={15} color="#fff" strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
              {form.portfolio.length < MAX_PORTFOLIO ? (
                <Pressable
                  onPress={uploading ? undefined : addPortfolioImage}
                  style={{
                    width: tileW,
                    height: tileW * 1.2,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                  }}
                >
                  <Icon name={uploading ? 'refresh' : 'plus'} size={26} color="#fff" />
                  <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', marginTop: 6 }}>{uploading ? 'Uploading…' : 'Add photo'}</Text>
                </Pressable>
              ) : null}
            </View>
            {error ? <Text style={{ fontSize: 13, color: '#FFB4B4', marginTop: 14 }}>{error}</Text> : null}
          </StoryPanel>
        );

      case 'reveal':
      default:
        return (
          <StoryPanel
            title={`You're all set${firstName ? `, ${firstName}` : ''}!`}
            subtitle="Here's your creator profile. Go live to start getting matched with brands."
            scroll={false}
            footer={
              <View style={{ gap: 8 }}>
                <NextPill label="Go live" icon="sparkles" onPress={submit} loading={submitting} />
                {error ? <Text style={{ fontSize: 13, color: '#FFB4B4', textAlign: 'center' }}>{error}</Text> : null}
              </View>
            }
          >
            <RevealRecap form={form} firstName={firstName} />
          </StoryPanel>
        );
    }
  }
}

/** Platform connector card — brand badge header + inputs, with an "In progress"
 *  chip once a handle + link are present. We don't actually verify the platform
 *  here (ownership/reach checks are admin-side / future scope), so the chip only
 *  signals "added, pending review" — never claims the account is verified. */
function SocialCard({
  icon,
  badge,
  name,
  sub,
  complete,
  children,
}: {
  icon: IconName;
  badge: readonly [string, string, ...string[]];
  name: string;
  sub: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: complete ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: complete ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.13)',
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <LinearGradient
          colors={badge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
        >
          <Icon name={icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>{name}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>{sub}</Text>
        </View>
        {complete ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,193,94,0.16)', borderWidth: 1, borderColor: 'rgba(255,193,94,0.42)' }}>
            <Icon name="clock" size={13} color="#FFC15E" strokeWidth={2.2} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFC15E' }}>In progress</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Amber inline warning shown when a platform is started but its link isn't a valid URL. */
function LinkHint({ show, platform }: { show: boolean; platform: string }) {
  if (!show) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <Icon name="alert" size={13} color="#FFD08A" strokeWidth={2.2} />
      <Text style={{ fontSize: 12.5, color: '#FFD08A', flex: 1 }}>Add a valid profile link (e.g. {platform}).</Text>
    </View>
  );
}

/** Ease a displayed integer up to `target` (cubic-out). */
function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return val;
}

function RevealRecap({ form, firstName }: { form: CreatorForm; firstName: string }) {
  const platforms = [
    form.social.igHandle.trim() && 'Instagram',
    form.social.ytHandle.trim() && 'YouTube',
    form.social.ttHandle.trim() && 'TikTok',
  ].filter(Boolean) as string[];
  const loc = [form.location.city, form.location.state].filter(Boolean).join(', ');
  const initial = (firstName.trim()[0] ?? 'Y').toUpperCase();

  // profile strength: share of the 5 meaningful sections completed
  const sections = [form.niche.length > 0, platforms.length > 0, form.contentTypes.length > 0, Boolean(loc), form.portfolio.length > 0 || Boolean(form.bio.trim())];
  const strength = Math.round((sections.filter(Boolean).length / sections.length) * 100);

  const bar = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    bar.value = reduced ? strength : withDelay(400, withTiming(strength, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [bar, strength, reduced]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value}%` }));

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Reanimated.View
        entering={reduced ? undefined : FadeInDown.duration(520).springify().damping(16)}
        style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } }}
      >
        <LinearGradient colors={['#0A3DC9', '#5B21B6', '#C026D3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 70 }} />
        <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          {/* avatar + verified badge */}
          <View style={{ marginTop: -36, width: 72 }}>
            <LinearGradient colors={['#FF7A45', '#D7263D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 72, height: 72, borderRadius: 999, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>{initial}</Text>
            </LinearGradient>
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 999, backgroundColor: '#1877F2', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={12} color="#fff" strokeWidth={3.5} />
            </View>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1C1E21', letterSpacing: -0.5, marginTop: 11 }}>{firstName || 'Your profile'}</Text>
          {loc ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Icon name="mappin" size={14} color="#65676B" strokeWidth={2} />
              <Text style={{ fontSize: 13, color: '#65676B' }}>{loc}</Text>
            </View>
          ) : null}

          {form.niche.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
              {form.niche.slice(0, 8).map((n, i) => (
                <Reanimated.View
                  key={n}
                  entering={reduced ? undefined : ZoomIn.delay(500 + i * 110).springify().damping(13).stiffness(220)}
                  style={{ backgroundColor: '#E7F0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1877F2' }}>{n}</Text>
                </Reanimated.View>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#DADDE1' }}>
            <RecapStat value={form.niche.length} label="Niches" />
            <View style={{ width: 1, backgroundColor: '#DADDE1' }} />
            <RecapStat value={platforms.length} label="Platforms" />
            <View style={{ width: 1, backgroundColor: '#DADDE1' }} />
            <RecapStat value={form.contentTypes.length} label="Formats" />
            <View style={{ width: 1, backgroundColor: '#DADDE1' }} />
            <RecapStat value={form.portfolio.length} label="Photos" />
          </View>

          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#65676B' }}>Profile strength</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#65676B' }}>{strength}%</Text>
            </View>
            <View style={{ height: 7, borderRadius: 999, backgroundColor: '#EBEDF0', overflow: 'hidden' }}>
              <Reanimated.View style={[{ height: '100%', borderRadius: 999 }, barStyle]}>
                <LinearGradient colors={['#16C79A', '#1877F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
              </Reanimated.View>
            </View>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

function RecapStat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 19, fontWeight: '800', color: '#1C1E21', letterSpacing: -0.5 }}>{shown}</Text>
      <Text style={{ fontSize: 10.5, color: '#8A8D91', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ── "Double-check your handles" confirmation ─────────────────────────────────
// A premium dark card (replaces the flat native Alert) shown before leaving the
// socials step — handles/links are what we verify against, so a typo means no
// verification. Matches the cinematic onboarding: scrim + glass card + one clear
// primary action.
function ConfirmHandlesCard({
  visible,
  onCheck,
  onConfirm,
}: {
  visible: boolean;
  onCheck: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCheck} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(6,7,12,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: '#171922',
            borderRadius: 26,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            padding: 24,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 20 },
          }}
        >
          {/* icon medallion */}
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'rgba(45,136,255,0.16)',
              borderWidth: 1,
              borderColor: 'rgba(90,160,255,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="badge" size={26} color="#5AA0FF" strokeWidth={2.2} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 8 }}>
            Double-check your handles
          </Text>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: '#A7ADB8' }}>
            Make sure every handle and profile link is exactly right. If anything is wrong, we can’t verify you and
            brands won’t see you as verified.
          </Text>

          <View style={{ marginTop: 22, gap: 10 }}>
            {/* primary */}
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 15,
                backgroundColor: '#2D88FF',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
                shadowColor: '#2D88FF',
                shadowOpacity: 0.35,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>It’s all correct</Text>
            </Pressable>
            {/* secondary */}
            <Pressable
              onPress={onCheck}
              accessibilityRole="button"
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#C9CED7' }}>Let me check again</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
