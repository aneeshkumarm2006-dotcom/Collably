/**
 * Live preview cards for the onboarding "profile builder" (Direction B). As the
 * user fills each step, the card at the top of the screen assembles itself in
 * real time — the same card brands will eventually see — so onboarding feels like
 * building something rather than filling a form.
 *
 * Each piece animates in as its data arrives: niches zoom in as tags, the city
 * fades in with a pin, the follower total counts up, the logo drops into place.
 * Layout reflow is smoothed with Reanimated's `LinearTransition`. The follower
 * count-up uses RN's `Animated` (a listener → state) since we render the value as
 * text; everything else uses Reanimated entering/layout animations.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Icon, RemoteImage } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { formatCompactNumber } from '@/lib/utils';

// ── helpers ──────────────────────────────────────────────────────────────────
const num = (s: string) => {
  const n = Number((s || '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Count a displayed integer up to `target` (RN Animated → state). */
function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target);
  const av = useRef(new RNAnimated.Value(target)).current;
  useEffect(() => {
    const id = av.addListener(({ value }) => setVal(value));
    RNAnimated.timing(av, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => av.removeListener(id);
  }, [target, duration, av]);
  return Math.round(val);
}

function MutedHint({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 12.5, color: colors.text3, fontStyle: 'italic' }}>{children}</Text>;
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: colors.text3, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function CardFrame({ children }: { children: React.ReactNode }) {
  const { colors, shadows } = useTheme();
  return (
    <Reanimated.View
      layout={LinearTransition.springify().damping(18).stiffness(170)}
      style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, ...shadows.card }}
    >
      {children}
    </Reanimated.View>
  );
}

// ── Creator preview ─────────────────────────────────────────────────────────
type CreatorCardData = {
  bio: string;
  niche: string[];
  location: { city?: string; state?: string };
  social: { igFollowers: string; ytSubs: string; ttFollowers: string };
  contentTypes: string[];
  isUGCOnly: boolean;
};

export function CreatorPreviewCard({ name, form }: { name: string; form: CreatorCardData }) {
  const { colors } = useTheme();
  const followers = num(form.social.igFollowers) + num(form.social.ytSubs) + num(form.social.ttFollowers);
  const shownFollowers = useCountUp(followers);
  const city = form.location.city?.trim();

  return (
    <CardFrame>
      <LinearGradient colors={[colors.brandGreen, colors.brandGreenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56 }} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        {/* avatar overlapping the banner + UGC/Creator badge */}
        <View style={{ marginTop: -28, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ borderWidth: 3, borderColor: colors.card, borderRadius: 999 }}>
            <Avatar name={name || 'You'} size={58} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginBottom: 4 }}>
            <Icon name={form.isUGCOnly ? 'camera' : 'sparkles'} size={12} color={colors.accent} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{form.isUGCOnly ? 'UGC Creator' : 'Creator'}</Text>
          </View>
        </View>

        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 9 }}>
          {name || 'Your name'}
        </Text>

        {city ? (
          <Reanimated.View entering={FadeIn.duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Icon name="mappin" size={13} color={colors.text2} strokeWidth={2} />
            <Text style={{ fontSize: 12.5, color: colors.text2 }}>{[city, form.location.state?.trim()].filter(Boolean).join(', ')}</Text>
          </Reanimated.View>
        ) : null}

        {/* niche tags fly in as picked */}
        <Reanimated.View layout={LinearTransition} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
          {form.niche.length === 0 ? (
            <MutedHint>Pick your niches — they'll appear here</MutedHint>
          ) : (
            form.niche.slice(0, 6).map((n) => (
              <Reanimated.View
                key={n}
                entering={ZoomIn.springify().damping(13).stiffness(220)}
                layout={LinearTransition}
                style={{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.accent }}>{n}</Text>
              </Reanimated.View>
            ))
          )}
        </Reanimated.View>

        {/* stat row */}
        <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hair }}>
          <Stat value={followers > 0 ? formatCompactNumber(shownFollowers) : '—'} label="Followers" />
          <View style={{ width: 1, backgroundColor: colors.hair }} />
          <Stat value={String(form.niche.length)} label="Niches" />
          <View style={{ width: 1, backgroundColor: colors.hair }} />
          <Stat value={String(form.contentTypes.length)} label="Formats" />
        </View>

        {form.bio.trim() ? (
          <Reanimated.View entering={FadeIn.duration(280)} style={{ marginTop: 12 }}>
            <Text numberOfLines={2} style={{ fontSize: 12.5, color: colors.text2, lineHeight: 17 }}>
              {form.bio.trim()}
            </Text>
          </Reanimated.View>
        ) : null}
      </View>
    </CardFrame>
  );
}

// ── Business preview ─────────────────────────────────────────────────────────
type BusinessCardData = {
  businessName: string;
  description: string;
  category: string | null;
  location: { city?: string; state?: string };
  website: string;
  socialLinks: { instagram: string; youtube: string; tiktok: string };
  logo: string | null;
};

export function BusinessPreviewCard({ form }: { form: BusinessCardData }) {
  const { colors } = useTheme();
  const city = form.location.city?.trim();
  // No dedicated TikTok glyph in the icon set — fall back to `play`.
  type SocialIcon = 'instagram' | 'youtube' | 'play';
  const socials: { key: string; icon: SocialIcon }[] = [
    form.socialLinks.instagram.trim() && { key: 'ig', icon: 'instagram' as const },
    form.socialLinks.youtube.trim() && { key: 'yt', icon: 'youtube' as const },
    form.socialLinks.tiktok.trim() && { key: 'tt', icon: 'play' as const },
  ].filter(Boolean) as { key: string; icon: SocialIcon }[];
  const initial = (form.businessName.trim()[0] ?? 'B').toUpperCase();

  return (
    <CardFrame>
      <LinearGradient colors={[colors.brandGreen, colors.brandGreenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56 }} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ marginTop: -30, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* logo drops in when uploaded, else a tinted initial */}
          {form.logo ? (
            <Reanimated.View
              key="logo"
              entering={ZoomIn.springify().damping(12).stiffness(200)}
              style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: colors.card, backgroundColor: colors.cardSunk }}
            >
              <RemoteImage source={{ uri: form.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} recyclingKey={form.logo} />
            </Reanimated.View>
          ) : (
            <View style={{ width: 60, height: 60, borderRadius: 16, borderWidth: 3, borderColor: colors.card, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.accent }}>{initial}</Text>
            </View>
          )}
          {socials.length > 0 ? (
            <Reanimated.View entering={FadeIn} layout={LinearTransition} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {socials.map((s) => (
                <Reanimated.View key={s.key} entering={ZoomIn} style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: colors.cardSunk, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={15} color={colors.text2} />
                </Reanimated.View>
              ))}
            </Reanimated.View>
          ) : null}
        </View>

        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 9 }}>
          {form.businessName.trim() || 'Your business'}
        </Text>

        <Reanimated.View layout={LinearTransition} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 5 }}>
          {form.category ? (
            <Reanimated.View entering={ZoomIn.springify().damping(13).stiffness(220)} style={{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.accent }}>{form.category}</Text>
            </Reanimated.View>
          ) : (
            <MutedHint>Pick a category to tag your brand</MutedHint>
          )}
          {city ? (
            <Reanimated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="mappin" size={13} color={colors.text2} strokeWidth={2} />
              <Text style={{ fontSize: 12.5, color: colors.text2 }}>{city}</Text>
            </Reanimated.View>
          ) : null}
        </Reanimated.View>

        {form.website.trim() ? (
          <Reanimated.View entering={FadeIn.duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <Icon name="link" size={13} color={colors.accent} strokeWidth={2} />
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.accent, flex: 1 }}>{form.website.trim().replace(/^https?:\/\//, '')}</Text>
          </Reanimated.View>
        ) : null}

        {form.description.trim() ? (
          <Reanimated.View entering={FadeIn.duration(280)} style={{ marginTop: 10 }}>
            <Text numberOfLines={2} style={{ fontSize: 12.5, color: colors.text2, lineHeight: 17 }}>
              {form.description.trim()}
            </Text>
          </Reanimated.View>
        ) : null}
      </View>
    </CardFrame>
  );
}

export { FadeInDown };
