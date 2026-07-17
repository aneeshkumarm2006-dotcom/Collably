/**
 * The creator home ("discover") design: a blue greeting header carrying the
 * creator's level, a quick-stats strip, a recommended rail, category chips, a
 * nearby panel, a deadline rail, and a featured banner.
 *
 * Presentation-only — screens own the data wiring. Everything here renders from
 * real API values; where the backend has nothing to say (no location permission,
 * no reward value) the component omits the element rather than inventing one.
 *
 * Note on colour names: `brandGreen*` / `brandYellow*` are historical token names
 * that hold **blue** values since the Meta-blue rebrand (see constants/theme.ts).
 */
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CoverImage } from '@/components/campaign';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { formatCompactNumber, formatMoney, formatMoneyCompact, formatReward } from '@/lib/utils';
import { formatDistance } from '@/lib/geo';
import { EASE } from '@/lib/motion';
import type { Campaign, BusinessProfile, CreatorProfile } from '@/types';
import { Press, CATEGORY_ICON } from './HomeKit';
import type { Category } from '@/constants';

type CampaignWithBiz = Campaign & { business?: BusinessProfile };

/** Text on the blue header. */
const INK = '#FFFFFF';
const INK_SOFT = 'rgba(255,255,255,0.78)';
/** The level card is a dark navy well on the blue header — fixed in both themes. */
const WELL = ['#0B2350', '#0A1B3D'] as const;

// ── Level / tier ────────────────────────────────────────────────────────────────

/**
 * The tier ladder. A creator's tier is derived from their level, so the badge and
 * the level can never disagree (the mock's "Level 4 · Newcomer" is not reachable).
 */
export const TIERS = [
  { name: 'Newcomer', minLevel: 1 },
  { name: 'Rising Star', minLevel: 3 },
  { name: 'Pro', minLevel: 6 },
  { name: 'Elite', minLevel: 9 },
  { name: 'Legend', minLevel: 12 },
] as const;

export type Tier = { name: string; rank: number };

/** Tier for a level, plus its 1-5 rank (drives the star row). */
export function tierFor(level: number): Tier {
  let i = 0;
  for (let t = 0; t < TIERS.length; t++) if (level >= TIERS[t].minLevel) i = t;
  return { name: TIERS[i].name, rank: i + 1 };
}

/** Shouts needed per level. Linear, so the bar's meaning is obvious. */
export const SHOUTS_PER_LEVEL = 100;

/**
 * What a Shout is worth.
 *
 * Deliberately coarse: a level is ~5 completed collabs, so the bar moves visibly
 * for real work instead of drifting up with every dollar. Rewards contribute only a
 * little, so a creator can't out-level a reliable peer just by taking one expensive
 * collab.
 */
export const SHOUTS_PER_COLLAB = 20;
/** $2,000 of verified rewards = 1 Shout. */
const DOLLARS_PER_SHOUT = 2000;

export type LevelState = {
  /** Lifetime Shouts. */
  shouts: number;
  level: number;
  shoutsInLevel: number;
  shoutsToNext: number;
  progress: number;
  tier: Tier;
};

/**
 * Shouts are a gamified view of REAL activity (completed collabs + rewards earned).
 * There's no fabricated starting balance, so a brand-new creator honestly sits at
 * 0 / 100 Shouts on Level 1 rather than the mock's 520.
 */
export function levelStateFor(profile: CreatorProfile | null): LevelState {
  const completed = profile?.totalCollabsCompleted ?? 0;
  const earned = profile?.totalRewardsEarned ?? 0;
  const shouts = completed * SHOUTS_PER_COLLAB + Math.floor(earned / DOLLARS_PER_SHOUT);
  const level = Math.floor(shouts / SHOUTS_PER_LEVEL) + 1;
  const shoutsInLevel = shouts % SHOUTS_PER_LEVEL;
  return {
    shouts,
    level,
    shoutsInLevel,
    shoutsToNext: SHOUTS_PER_LEVEL - shoutsInLevel,
    progress: shoutsInLevel / SHOUTS_PER_LEVEL,
    tier: tierFor(level),
  };
}

/** Five stars, filled to the creator's tier rank (Newcomer 1 → Legend 5). */
function StarRow({ rank }: { rank: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1.5, marginTop: 5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={i <= rank ? 'star_f' : 'star'}
          size={12}
          color={i <= rank ? '#FFC93C' : 'rgba(255,255,255,0.32)'}
        />
      ))}
    </View>
  );
}

/** The dark navy level well on the header: level, tier, stars, Shouts bar, next level. */
export function LevelWell({ state }: { state: LevelState }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = reduced
      ? state.progress
      : withTiming(state.progress, { duration: 900, easing: EASE.out });
  }, [state.progress, reduced, fill]);

  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <LinearGradient
      colors={WELL}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: 146, borderRadius: 16, padding: 11 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: INK, letterSpacing: -0.3 }}>
          Level {state.level}
        </Text>
        <View
          style={{
            flexShrink: 1,
            backgroundColor: 'rgba(255,255,255,0.16)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '800', color: INK }}>
            {state.tier.name}
          </Text>
        </View>
      </View>

      <StarRow rank={state.tier.rank} />

      <Text style={{ fontFamily: 'monospace', fontSize: 10.5, color: INK_SOFT, marginTop: 7 }}>
        {state.shoutsInLevel} / {SHOUTS_PER_LEVEL} Shouts
      </Text>
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.18)',
          marginTop: 5,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[{ height: 5, borderRadius: 3, backgroundColor: '#4DA3FF' }, barStyle]} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          gap: 6,
        }}
      >
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 9.5, color: INK_SOFT }}>
          Next: Level {state.level + 1}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon name="badge" size={10} color={INK_SOFT} />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: INK_SOFT }}>
            {state.shoutsToNext} Shouts
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────────

/** "Good morning / afternoon / evening" for the device's local hour. */
export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** One header stat (icon + value + label), separated by hairlines. */
function HeaderStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={14} color={INK} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: INK, letterSpacing: -0.3 }}>
          {value}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 9, color: INK_SOFT, marginTop: -1 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * The header's three at-a-glance stats. Each is omitted when it has nothing real to
 * report, so an empty account shows fewer chips rather than a row of zeroes.
 */
export function HeaderStats({
  newCollabs,
  potentialRewards,
  nearby,
}: {
  newCollabs: number;
  potentialRewards: number;
  nearby: number;
}) {
  const stats: { icon: IconName; value: string; label: string }[] = [];
  if (newCollabs > 0) stats.push({ icon: 'zap', value: String(newCollabs), label: 'New collabs' });
  if (potentialRewards > 0)
    stats.push({ icon: 'gift', value: formatMoneyCompact(potentialRewards), label: 'Potential rewards' });
  if (nearby > 0) stats.push({ icon: 'mappin', value: String(nearby), label: 'Nearby' });
  if (stats.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={{
            flex: 1,
            flexDirection: 'row',
            borderLeftWidth: i ? 1 : 0,
            borderLeftColor: 'rgba(255,255,255,0.22)',
            paddingLeft: i ? 9 : 0,
            marginLeft: i ? 9 : 0,
          }}
        >
          <HeaderStat {...s} />
        </View>
      ))}
    </View>
  );
}

// ── Quick stats strip ───────────────────────────────────────────────────────────

const QUICK_TONES: Record<string, [string, string]> = {
  earned: ['#E7F0FF', '#1877F2'],
  active: ['#E3F1E6', '#31A24C'],
  due: ['#FDEAEA', '#FA383E'],
  applied: ['#F0E9FC', '#8B5CF6'],
};

/** The white strip under the search pill: earned / active / due now / applied. */
export function QuickStats({
  earned,
  active,
  dueNow,
  applied,
  onPress,
}: {
  earned: number;
  active: number;
  dueNow: number;
  applied: number;
  onPress?: () => void;
}) {
  const { colors, shadows, isDark } = useTheme();

  const items: { key: keyof typeof QUICK_TONES; icon: IconName; value: string; label: string }[] = [
    { key: 'earned', icon: 'payout', value: formatMoneyCompact(earned), label: 'Earned' },
    { key: 'active', icon: 'collab', value: String(active), label: 'Active' },
    { key: 'due', icon: 'clock', value: String(dueNow), label: 'Due now' },
    { key: 'applied', icon: 'campaign', value: String(applied), label: 'Applied' },
  ];

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
      <Press
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hair,
          borderRadius: 16,
          paddingVertical: 13,
          paddingHorizontal: 8,
          ...shadows.card,
        }}
      >
        {items.map((it, i) => {
          const [soft, fg] = QUICK_TONES[it.key];
          return (
            <View
              key={it.key}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 6,
                borderLeftWidth: i ? 1 : 0,
                borderLeftColor: colors.hair,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: isDark ? `${fg}26` : soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={it.icon} size={15} color={fg} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}
                >
                  {it.value}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 9.5, color: colors.text2, marginTop: -1 }}>
                  {it.label}
                </Text>
              </View>
            </View>
          );
        })}
      </Press>
    </View>
  );
}

// ── Recommended rail ────────────────────────────────────────────────────────────

/** The heart. Filled when saved; a tap toggles without opening the card. */
export function SaveHeart({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onToggle}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.94)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Icon
        name={saved ? 'heart_f' : 'heart'}
        size={16}
        color={saved ? colors.danger : '#65676B'}
        strokeWidth={2.2}
      />
    </Press>
  );
}

/** A recommended collab: match score, save heart, offer, platform, applied count. */
export function RecommendedCard({
  campaign,
  score,
  saved,
  onToggleSave,
  onPress,
  onApply,
}: {
  campaign: CampaignWithBiz;
  score: number;
  saved: boolean;
  onToggleSave: () => void;
  onPress: () => void;
  onApply: () => void;
}) {
  const { colors, shadows } = useTheme();
  const platform = campaign.deliverables[0]?.platform;

  return (
    <Press
      onPress={onPress}
      style={{
        width: 232,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 18,
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <View>
        <CoverImage src={campaign.coverImage} category={campaign.category} radius={0} style={{ width: 232, height: 132 }} />
        <View
          style={{
            position: 'absolute',
            top: 9,
            left: 9,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(12,131,31,0.94)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Icon name="zap" size={11} color="#fff" strokeWidth={2.4} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{score}% match</Text>
        </View>
        <View style={{ position: 'absolute', top: 9, right: 9 }}>
          <SaveHeart saved={saved} onToggle={onToggleSave} />
        </View>
      </View>

      <View style={{ padding: 12 }}>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: colors.text2 }}>
          {campaign.business?.businessName ?? 'Brand'}
        </Text>
        <Text
          numberOfLines={2}
          style={{ fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginTop: 2, lineHeight: 18 }}
        >
          {formatReward(campaign.reward)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            {platform ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={platform === 'YouTube' ? 'youtube' : 'instagram'} size={12} color={colors.text3} />
                <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.text3 }}>
                  {platform}
                </Text>
              </View>
            ) : null}
            {campaign.applicationsCount > 0 ? (
              <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.text3 }}>
                {formatCompactNumber(campaign.applicationsCount)} applied
              </Text>
            ) : null}
          </View>

          <Press
            onPress={onApply}
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: colors.brandGreen,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#fff' }}>Apply</Text>
            <Icon name="arrowR" size={13} color="#fff" strokeWidth={2.4} />
          </Press>
        </View>
      </View>
    </Press>
  );
}

// ── Category chips ──────────────────────────────────────────────────────────────

/** A category pill. The active one fills with the brand colour. */
export function CategoryChip({
  category,
  active,
  onPress,
}: {
  category: Category;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, shadows } = useTheme();
  return (
    <Press
      onPress={onPress}
      style={{
        width: 74,
        alignItems: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 16,
        backgroundColor: active ? colors.brandGreen : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.brandGreen : colors.hair,
        ...shadows.card,
      }}
    >
      <Icon
        name={CATEGORY_ICON[category]}
        size={22}
        color={active ? '#fff' : colors.brandGreenText}
        strokeWidth={1.9}
      />
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.text2 }}
      >
        {category}
      </Text>
    </Press>
  );
}

// ── Nearby panel ────────────────────────────────────────────────────────────────

/**
 * One nearby collab. Shows an approximate distance when we know where the user is,
 * and falls back to the city otherwise — never a fabricated "2.3 km".
 */
function NearbyRow({
  campaign,
  distanceKm,
  onPress,
}: {
  campaign: CampaignWithBiz;
  distanceKm?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const value = campaign.reward?.estimatedValue;
  // An exact pin is only ever sent to an accepted creator; otherwise the point is
  // fuzzed, so the distance must read as approximate.
  const exact = campaign.location?.locationPrecise === true;
  const where =
    distanceKm !== undefined ? formatDistance(distanceKm, exact) : campaign.location?.city;

  return (
    <Press
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 14,
        padding: 9,
      }}
    >
      <CoverImage src={campaign.coverImage} category={campaign.category} radius={10} style={{ width: 42, height: 42 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
          {campaign.business?.businessName ?? campaign.title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.text2, marginTop: 1 }}>
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
          {typeof value === 'number' && value > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: colors.brandGreenSoft,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Icon name="gift" size={10} color={colors.brandGreenText} />
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.brandGreenText }}>
                {formatMoney(value)}
              </Text>
            </View>
          ) : null}
          {where ? (
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 10.5, color: colors.text3 }}>
              · {where}
            </Text>
          ) : null}
        </View>
      </View>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          backgroundColor: colors.brandGreenSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="arrowR" size={15} color={colors.brandGreenText} strokeWidth={2.4} />
      </View>
    </Press>
  );
}

export function NearbyPanel({
  campaigns,
  distances,
  radiusLabel,
  onOpenMap,
  onOpen,
}: {
  campaigns: CampaignWithBiz[];
  /** campaignId → km. Empty when location is unknown; rows then show the city. */
  distances: Map<string, number>;
  /** e.g. "2 within 5 km", or "2 nearby" when we can't measure. */
  radiusLabel: string;
  onOpenMap: () => void;
  onOpen: (c: CampaignWithBiz) => void;
}) {
  const { colors, isDark } = useTheme();
  if (campaigns.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(45,136,255,0.10)' : '#EAF2FE',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(45,136,255,0.22)' : '#D6E6FC',
          borderRadius: 20,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <Icon name="mappin" size={17} color={colors.brandGreenText} strokeWidth={2.2} />
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
            Nearby opportunities
          </Text>
          <View
            style={{
              backgroundColor: isDark ? 'rgba(45,136,255,0.18)' : '#D6E6FC',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.brandGreenText }}>
              {radiusLabel}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Press onPress={onOpenMap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandGreenText }}>Open map</Text>
              <Icon name="arrowR" size={13} color={colors.brandGreenText} strokeWidth={2.4} />
            </View>
          </Press>
        </View>

        <View style={{ flexDirection: 'row', gap: 9 }}>
          {campaigns.slice(0, 2).map((c) => (
            <NearbyRow key={c._id} campaign={c} distanceKm={distances.get(c._id)} onPress={() => onOpen(c)} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Deadlines ───────────────────────────────────────────────────────────────────

/** Urgency → [light bg, dark bg, foreground]. */
function deadlineTone(days: number): [string, string, string] {
  if (days <= 0) return ['#FDEAEA', 'rgba(250,56,62,0.14)', '#FA383E'];
  if (days <= 2) return ['#FDF1DF', 'rgba(243,166,8,0.16)', '#C77700'];
  return ['#E3F1E6', 'rgba(49,162,76,0.16)', '#1F7A38'];
}

export function DeadlineCard({
  title,
  subtitle,
  cover,
  category,
  days,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  cover?: string | null;
  category: Category;
  days: number;
  onSubmit: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [light, dark, fg] = deadlineTone(days);
  const label = days <= 0 ? 'Due now' : days === 1 ? '1 day left' : `${days} days left`;

  return (
    <Press
      onPress={onSubmit}
      style={{
        width: 212,
        backgroundColor: isDark ? dark : light,
        borderWidth: 1,
        borderColor: `${fg}33`,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="clock" size={12} color={fg} strokeWidth={2.4} />
        <Text style={{ fontSize: 11, fontWeight: '800', color: fg }}>{label}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <CoverImage src={cover} category={category} radius={10} style={{ width: 40, height: 40 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.text2, marginTop: 1 }}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 11 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: fg }}>Submit</Text>
        <Icon name="arrowR" size={13} color={fg} strokeWidth={2.4} />
      </View>
    </Press>
  );
}

// ── Featured banner ─────────────────────────────────────────────────────────────

export function FeaturedBanner({
  campaign,
  onPress,
}: {
  campaign: CampaignWithBiz;
  onPress: () => void;
}) {
  const { shadows } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
      <Press onPress={onPress} style={{ borderRadius: 20, overflow: 'hidden', ...shadows.cardStrong }}>
        <CoverImage
          src={campaign.coverImage}
          category={campaign.category}
          radius={20}
          style={{ width: '100%', height: 172 }}
        >
          {/* Left-weighted scrim so the copy reads while the product photo stays visible. */}
          <LinearGradient
            colors={['rgba(6,20,48,0.94)', 'rgba(6,20,48,0.74)', 'rgba(6,20,48,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ position: 'absolute', top: 13, left: 13 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(255,255,255,0.22)',
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 20,
              }}
            >
              <Icon name="star_f" size={11} color="#FFC93C" />
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#fff' }}>Featured</Text>
            </View>
          </View>

          <View style={{ position: 'absolute', left: 14, right: 90, bottom: 13 }}>
            <Text
              numberOfLines={2}
              style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.4, lineHeight: 22 }}
            >
              {campaign.title}
            </Text>
            {campaign.applicationsCount > 0 ? (
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>
                {formatCompactNumber(campaign.applicationsCount)} creators applied
              </Text>
            ) : null}
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#fff',
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 11,
                marginTop: 11,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1877F2' }}>Apply now</Text>
              <Icon name="arrowR" size={13} color="#1877F2" strokeWidth={2.4} />
            </View>
          </View>
        </CoverImage>
      </Press>
    </View>
  );
}

// ── Section heading ─────────────────────────────────────────────────────────────

/** "Recommended for you  ·  View all →" */
export function DiscoverSection({
  title,
  icon,
  action,
  onAction,
  children,
}: {
  title: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {icon ? <Icon name={icon} size={17} color={colors.text} strokeWidth={2.2} /> : null}
          <Text style={{ fontSize: 17.5, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
            {title}
          </Text>
        </View>
        {action && onAction ? (
          <Press onPress={onAction}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brandGreenText }}>{action}</Text>
              <Icon name="chevR" size={14} color={colors.brandGreenText} strokeWidth={2.4} />
            </View>
          </Press>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export { INK as HEADER_INK, INK_SOFT as HEADER_INK_SOFT };
