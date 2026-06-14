/**
 * Welcome / landing screen (PRD §7.1) — premium onboarding carousel matching the
 * CollabSpace design: full-bleed lifestyle photography, an eyebrow + big title +
 * body per slide, pagination dots, and the role-pick CTAs pinned at the bottom.
 *
 * Responsive: the carousel measures the space left above the pinned CTA block and
 * sizes each slide (image + copy) to fit it exactly, so nothing clips or overflows
 * on short phones, large phones, or tablets.
 *
 * Each CTA drives a real navigation / state transition the root auth gate reacts to:
 *   - Join as Business / Creator → signup (role pre-selected via `?role=`)
 *   - Browse Campaigns          → guest mode (PRD §8.6) → creator explore
 *   - Log in                    → login
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { CoverImage } from '@/components/campaign';
import { Icon, type IconName } from '@/components/ui';
import { BrandMark } from '@/components/shared';
import { useAuthStore } from '@/store/authStore';
import type { Category } from '@/constants';

type Slide = { category: Category; img: string; eyebrow: string; title: string; body: string };

/** Real lifestyle photography (Unsplash) — the design's "realism" pick. */
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const SLIDES: Slide[] = [
  {
    category: 'Restaurant',
    img: '1504674900247-0877df9cc836',
    eyebrow: 'REAL REWARDS',
    title: 'Earn perks worth real money',
    body: 'Every campaign spells out exactly what you earn — from tasting menus to skincare sets — with the value up front.',
  },
  {
    category: 'Fashion',
    img: '1490481651871-ab68de25d43d',
    eyebrow: 'NO GATEKEEPING',
    title: 'No follower minimums, ever',
    body: 'Nano and UGC creators welcome. Brands match on fit and quality — not vanity metrics or agency rosters.',
  },
  {
    category: 'Cafe',
    img: '1517248135467-4c7edcad34c4',
    eyebrow: 'LOCAL FIRST',
    title: 'Collab with spots near you',
    body: 'Campaigns surface by city and niche, so you work with brands right in your neighbourhood.',
  },
];

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [index, setIndex] = useState(0);

  // The dark photo at the top needs light status-bar icons; restore the theme
  // default on the way out so the auth forms read correctly.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle(isDark ? 'light' : 'dark', true);
    }, [isDark]),
  );
  // Height of the carousel area (everything above the pinned CTA block). Measured
  // so slides fit any screen exactly instead of guessing from window height.
  const [carouselH, setCarouselH] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0); // current slide, readable inside the timer without re-subscribing

  // Auto-advance every 3.5s, looping back to the first slide after the last. It
  // always advances from wherever the user last landed (indexRef), so manual
  // swipes never leave it stuck — the carousel keeps playing on its own.
  useEffect(() => {
    if (carouselH === 0 || width === 0 || SLIDES.length < 2) return;
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % SLIDES.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, 3500);
    return () => clearInterval(id);
  }, [carouselH, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== indexRef.current) {
      indexRef.current = i;
      setIndex(i);
    }
  };

  // Enter guest mode (PRD §8.6) and jump straight to Explore.
  const browseAsGuest = () => {
    continueAsGuest();
    router.replace('/(creator)/(tabs)/explore');
  };

  // Image gets ~55% of the available area; copy fills the rest. Clamp so the image
  // never dominates a very tall tablet or starves a very short phone.
  const imageHeight = Math.max(180, Math.min(Math.round(carouselH * 0.55), 460));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Photo carousel (fills the space above the CTAs) ── */}
      <View style={{ flex: 1 }} onLayout={(e) => setCarouselH(e.nativeEvent.layout.height)}>
        {carouselH > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              indexRef.current = i;
              setIndex(i);
            }}
            scrollEventThrottle={16}
          >
            {SLIDES.map((s) => (
              <View key={s.eyebrow} style={{ width, height: carouselH }}>
                {/* Each slide scrolls vertically so its image + copy are always
                    reachable, however short the screen. */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 14 }}>
                  <View style={{ height: imageHeight }}>
                    <CoverImage src={unsplash(s.img)} category={s.category} style={{ width, height: imageHeight }}>
                      <LinearGradient
                        colors={['transparent', colors.bg]}
                        start={{ x: 0, y: 0.45 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
                      />
                      {/* Brand lockup over the image — design connector mark, white */}
                      <View style={{ position: 'absolute', top: insets.top + 14, left: 24 }}>
                        <BrandMark size={34} wordmark color="#fff" wordmarkColor="#fff" />
                      </View>
                    </CoverImage>
                  </View>

                  <View style={{ paddingHorizontal: 30, paddingTop: 10, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.6, color: colors.brandGreenText, fontWeight: '600' }}>
                      {s.eyebrow}
                    </Text>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6, lineHeight: 31, marginTop: 12, textAlign: 'center' }}>
                      {s.title}
                    </Text>
                    <Text style={{ fontSize: 15, color: colors.text2, lineHeight: 22, marginTop: 12, textAlign: 'center' }}>
                      {s.body}
                    </Text>
                  </View>
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── Dots + role-pick CTAs (always pinned + visible) ── */}
      <View style={{ paddingHorizontal: 28, paddingTop: 8, paddingBottom: insets.bottom + 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
          {SLIDES.map((s, d) => (
            <View
              key={s.eyebrow}
              style={{
                width: d === index ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: d === index ? colors.brandGreen : colors.hairStrong,
              }}
            />
          ))}
        </View>

        <Text style={{ fontSize: 12.5, color: colors.text3, textAlign: 'center', marginBottom: 12 }}>How do you want to start?</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <RoleTile
            variant="secondary"
            icon="briefcase"
            title="Business"
            subtitle="Post campaigns"
            onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: 'business' } })}
          />
          <RoleTile
            variant="primary"
            icon="sparkles"
            title="Creator"
            subtitle="Find collabs"
            onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: 'creator' } })}
          />
        </View>

        <View style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandGreenText }} onPress={browseAsGuest}>
            Browse campaigns
          </Text>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.text2 }}>Already have an account? </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandGreenText }} onPress={() => router.push('/(auth)/login')}>
            Log in
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Premium role-pick tile: green-gradient "Creator" (primary), outlined "Business". */
function RoleTile({
  variant,
  icon,
  title,
  subtitle,
  onPress,
}: {
  variant: 'primary' | 'secondary';
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const primary = variant === 'primary';

  const inner = (
    <>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          backgroundColor: primary ? 'rgba(255,255,255,0.22)' : colors.brandGreenSoft,
        }}
      >
        <Icon name={icon} size={23} color={primary ? '#fff' : colors.brandGreenText} />
      </View>
      <Text style={{ fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', color: primary ? '#fff' : colors.text }}>
        {title}
      </Text>
      <Text style={{ fontSize: 12, marginTop: 2, textAlign: 'center', color: primary ? 'rgba(255,255,255,0.85)' : colors.text2 }}>{subtitle}</Text>
    </>
  );

  // Identical box for both tiles → guaranteed equal height + matching shadow so
  // they line up perfectly (no green-glow size mismatch).
  const boxStyle = {
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.96 }]}
    >
      {primary ? (
        <LinearGradient colors={[colors.brandGreen, colors.brandGreenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={boxStyle}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={{ ...boxStyle, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair }}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}
