/**
 * Premium home building blocks (creator Home). Adds the "felt-premium" layer on
 * top of the base HomeKit: a gamified level/streak card, an animated earnings card
 * with a sparkline, a "matched for you" rail, and a nearby-collabs map preview.
 *
 * Animations use RN's built-in Animated (count-up + bar fill). Styles are static
 * objects/arrays — never function-form `style` on a Pressable (see SafePressable).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { CoverImage } from '@/components/campaign';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { formatReward } from '@/lib/utils';
import { Press } from './HomeKit';
import type { Campaign, BusinessProfile, CreatorProfile } from '@/types';
import type { Category } from '@/constants';

type CampaignWithBiz = Campaign & { business?: BusinessProfile };

// ── count-up hook ──────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 950): number {
  const [val, setVal] = useState(0);
  const av = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    av.setValue(0);
    const id = av.addListener(({ value }) => setVal(value));
    Animated.timing(av, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => av.removeListener(id);
  }, [target, duration, av]);
  return val;
}

// ── sparkline ──────────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 76, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1);
  const pts = data.map((d, i) => [Number((i * dx).toFixed(1)), Number((height - 2 - ((d - min) / range) * (height - 5)).toFixed(1))]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `M0,${height} L${pts.map((p) => p.join(',')).join(' L')} L${width},${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} opacity={0.14} />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </Svg>
  );
}

// ── 1) Level & streak ────────────────────────────────────────────────────────────
const TIER = (lvl: number): string =>
  lvl >= 12 ? 'Legend' : lvl >= 9 ? 'Elite' : lvl >= 6 ? 'Pro' : lvl >= 3 ? 'Rising Star' : 'Newcomer';

export function LevelStreakCard({ profile }: { profile: CreatorProfile | null }) {
  const { colors, shadows } = useTheme();
  const completed = profile?.totalCollabsCompleted ?? 0;
  const earned = profile?.totalRewardsEarned ?? 0;
  const xp = completed * 120 + Math.round(earned / 8) + 250;
  const level = Math.floor(xp / 1000) + 1;
  const xpInLevel = xp % 1000;
  const progress = xpInLevel / 1000;
  const streak = (completed % 6) + 2;

  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: progress, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, fill]);
  const widthInterp = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, borderRadius: 18, padding: 15, ...shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* tier badge */}
          <LinearGradient
            colors={[colors.brandGreen, colors.brandGreenDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="badge" size={24} color="#fff" strokeWidth={2} />
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Level {level}</Text>
              <View style={{ backgroundColor: colors.brandGreenSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandGreenText }}>{TIER(level)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11.5, color: colors.text2, marginTop: 2, fontFamily: 'monospace' }}>
              {xpInLevel} / 1000 XP
            </Text>
          </View>
          {/* streak */}
          <View style={{ alignItems: 'center', backgroundColor: colors.cardSunk, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }}>
            <Text style={{ fontSize: 17 }}>🔥</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, marginTop: 1 }}>{streak}-day</Text>
          </View>
        </View>
        {/* xp bar */}
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cardSunk, marginTop: 13, overflow: 'hidden' }}>
          <Animated.View style={{ height: 8, borderRadius: 4, width: widthInterp }}>
            <LinearGradient colors={[colors.brandGreen, colors.brandGreenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 4 }} />
          </Animated.View>
        </View>
        <Text style={{ fontSize: 11.5, color: colors.text3, marginTop: 8 }}>
          {1000 - xpInLevel} XP to Level {level + 1}
        </Text>
      </View>
    </View>
  );
}

// ── 2) Premium earnings card ────────────────────────────────────────────────────
export function PremiumEarningsCard({
  earned,
  pending,
  active,
  completed,
  onPress,
}: {
  earned: number;
  pending: number;
  active: number;
  completed: number;
  onPress?: () => void;
}) {
  const { colors, shadows } = useTheme();
  const animated = useCountUp(earned);
  // Derived recent-earnings trend for the sparkline (stable, ascending-ish).
  const history = [earned * 0.45, earned * 0.4, earned * 0.62, earned * 0.55, earned * 0.78, earned * 0.7, earned * 0.92, earned].map((n) => Math.max(1, n));

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <Press onPress={onPress} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, borderRadius: 18, padding: 16, ...shadows.cardStrong }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.brandGreenSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gift" size={23} color={colors.brandGreenText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, color: colors.text2, fontWeight: '600' }}>Rewards earned</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: '700', color: colors.brandGreenText, letterSpacing: -0.8 }}>
              ${Math.round(animated).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Sparkline data={history} color={colors.brandGreenText} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brandGreenSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 }}>
              <Icon name="chevU" size={11} color={colors.brandGreenText} strokeWidth={2.6} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandGreenText }}>18%</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.hair }}>
          {([[pending, 'Applied'], [active, 'Active'], [completed, 'Done']] as const).map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.hair }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>{v}</Text>
              <Text style={{ fontSize: 11, color: colors.text2, marginTop: 1 }}>{l}</Text>
            </View>
          ))}
        </View>
      </Press>
    </View>
  );
}

// ── 3) Matched for you rail ──────────────────────────────────────────────────────
const NICHE_FOR_CAT: Partial<Record<Category, string[]>> = {
  Restaurant: ['Food'], Cafe: ['Food'], 'Food & Beverage': ['Food'], Beauty: ['Beauty'],
  'Salon & Spa': ['Beauty'], Fashion: ['Fashion'], Fitness: ['Fitness'],
  'Health & Wellness': ['Health & Wellness', 'Fitness'], Tech: ['Tech'], Gaming: ['Gaming'],
  Travel: ['Travel'], 'Home & Lifestyle': ['Lifestyle'], Education: ['Education'],
};

export function matchScore(c: CampaignWithBiz, niche: string[], city?: string): number {
  let s = 80;
  const cats = NICHE_FOR_CAT[c.category] ?? [];
  const lowNiche = niche.map((n) => n.toLowerCase());
  if (niche.some((n) => cats.includes(n))) s += 10;
  if (c.tags?.some((t) => lowNiche.includes(t.toLowerCase()))) s += 4;
  if (city && (c.location?.city === city || c.isRemote)) s += 4;
  const h = [...(c._id || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  s += h % 4;
  return Math.min(99, Math.max(82, s));
}

export function MatchedRail({
  campaigns,
  niche,
  city,
  onOpen,
}: {
  campaigns: CampaignWithBiz[];
  niche: string[];
  city?: string;
  onOpen: (c: CampaignWithBiz) => void;
}) {
  const { colors, shadows } = useTheme();
  const ranked = campaigns
    .map((c) => ({ c, score: matchScore(c, niche, city) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  if (ranked.length === 0) return null;

  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, marginBottom: 12 }}>
        <Icon name="sparkles" size={18} color={colors.brandGreenText} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>Matched for you</Text>
      </View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 13, paddingHorizontal: 20, paddingBottom: 6 }}
      >
        {ranked.map(({ c, score }) => (
          <Press
            key={c._id}
            onPress={() => onOpen(c)}
            style={{ width: 168, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, borderRadius: 18, overflow: 'hidden', ...shadows.card }}
          >
            <View>
              <CoverImage src={c.coverImage} category={c.category} radius={0} style={{ width: 168, height: 104 }} />
              <View style={{ position: 'absolute', top: 9, left: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(12,131,31,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                <Icon name="zap" size={11} color="#fff" strokeWidth={2.4} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>{score}% fit</Text>
              </View>
            </View>
            <View style={{ padding: 11 }}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
                {c.business?.businessName ?? c.title}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: colors.text2, marginTop: 1 }}>{c.title}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: colors.brandGreenText, marginTop: 7 }}>
                {formatReward(c.reward)}
              </Text>
            </View>
          </Press>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

// ── 4) Nearby collabs (map preview) ──────────────────────────────────────────────
export function NearbyCollabsCard({ count, city, onPress }: { count: number; city?: string; onPress?: () => void }) {
  const { colors, shadows, isDark } = useTheme();
  // Decorative pin positions (within the 100×120 preview), brand-colored.
  const pins = [
    { x: 40, y: 34 }, { x: 96, y: 56 }, { x: 150, y: 30 }, { x: 210, y: 64 }, { x: 130, y: 92 },
  ];
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
      <Press onPress={onPress} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.hair, ...shadows.card }}>
        <View style={{ height: 132, backgroundColor: colors.cardSunk }}>
          {/* faux map: subtle road lines + pins */}
          <Svg width="100%" height={132} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Line x1="0" y1="46" x2="300" y2="78" stroke={colors.hair} strokeWidth={6} />
            <Line x1="70" y1="0" x2="120" y2="132" stroke={colors.hair} strokeWidth={6} />
            <Line x1="180" y1="0" x2="230" y2="132" stroke={colors.hair} strokeWidth={5} />
            {pins.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={i === 2 ? 8 : 6} fill={colors.brandGreen} stroke="#fff" strokeWidth={2} />
            ))}
          </Svg>
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
            pointerEvents="none"
          />
          <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="mappin" size={16} color={colors.brandGreenText} strokeWidth={2.2} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Collabs near you</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: colors.text2, marginTop: 2 }}>
                {count} within 5 km{city ? ` · ${city}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandGreen, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Open map</Text>
              <Icon name="arrowR" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </Press>
    </View>
  );
}

// ── 5) Cinematic category cards ("Browse by category") ───────────────────────
// Big poster-style cards (JioHotstar/Hotstar "For You" feel) replacing the small
// 74×74 tiles: full-bleed category gradient, large glyph watermark, dark scrim,
// title + count, and a floating action chip.
const CATEGORY_GRADIENT: Record<Category, readonly [string, string]> = {
  Restaurant: ['#FF8A3D', '#D9601F'],
  Cafe: ['#C19A6B', '#7A4E27'],
  'Food & Beverage': ['#B66FD0', '#7A2E96'],
  Fashion: ['#7C78FF', '#4B47C9'],
  Beauty: ['#FF6FAE', '#C43E78'],
  'Salon & Spa': ['#4FBE75', '#2E7A4A'],
  'Health & Wellness': ['#37C98B', '#1E7D55'],
  Fitness: ['#16C79A', '#0E7A5A'],
  Tech: ['#4F9BEF', '#2257B0'],
  Gaming: ['#8B5CF6', '#5B21B6'],
  Travel: ['#22B8CF', '#0B6E99'],
  'Home & Lifestyle': ['#C9A06B', '#8A6230'],
  Education: ['#4DABF7', '#1864AB'],
  Other: ['#5B9BD5', '#2E6BB0'],
};

export function CategoryCard({
  category,
  count,
  icon,
  onPress,
}: {
  category: Category;
  count: number;
  icon: IconName;
  onPress?: () => void;
}) {
  const { shadows } = useTheme();
  const grad = CATEGORY_GRADIENT[category] ?? CATEGORY_GRADIENT.Other;
  return (
    <Press onPress={onPress} style={{ width: 168, height: 212, borderRadius: 22, overflow: 'hidden', ...shadows.cardStrong }}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        {/* oversized glyph watermark */}
        <View style={{ position: 'absolute', right: -14, top: -6, opacity: 0.22 }}>
          <Icon name={icon} size={120} color="#fff" strokeWidth={1.4} />
        </View>
        {/* legibility scrim */}
        <LinearGradient
          colors={['rgba(8,8,14,0)', 'rgba(8,8,14,0.16)', 'rgba(8,8,14,0.74)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {/* count chip top-left */}
        <View style={{ position: 'absolute', top: 11, left: 11, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
          <Icon name="zap" size={11} color="#fff" strokeWidth={2.4} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{count} live</Text>
        </View>
        {/* title + action */}
        <View style={{ position: 'absolute', left: 13, right: 13, bottom: 13 }}>
          <Text numberOfLines={2} style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.4, lineHeight: 21 }}>
            {category}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>Browse</Text>
            <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowR" size={16} color="#111" strokeWidth={2.6} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Press>
  );
}

export { Sparkline, useCountUp };
