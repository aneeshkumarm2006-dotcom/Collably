/**
 * Shimmering skeleton placeholder for async content (PRD §8.5 — no blank screens).
 *
 * `Skeleton` is a single shimmering block; `SkeletonText` renders N lines; the
 * exported presets (`SkeletonCard`, `SkeletonListItem`) match the real card
 * layouts so swapping in loaded data doesn't shift the page. The shimmer runs on
 * the UI thread via Reanimated, so it stays smooth during data fetches.
 */
import { useEffect } from 'react';
import { View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/components/ThemeProvider';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A stack of skeleton lines (last line shortened, like real paragraphs). */
export function SkeletonText({ lines = 3, lineHeight = 12, gap = 8 }: { lines?: number; lineHeight?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

/** Placeholder matching a CampaignCard (cover + title + meta). */
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Skeleton height={160} radius={0} />
      <View style={{ padding: 14, gap: 10 }}>
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="50%" />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Skeleton height={22} width={70} radius={999} />
          <Skeleton height={22} width={60} radius={999} />
        </View>
      </View>
    </View>
  );
}

/** Placeholder matching a compact list row (avatar + two lines). */
export function SkeletonListItem() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <Skeleton width={48} height={48} radius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={11} width="40%" />
      </View>
    </View>
  );
}
