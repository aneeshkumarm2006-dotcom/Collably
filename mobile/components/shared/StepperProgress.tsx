/**
 * Multi-step progress indicator for the onboarding flows (PRD §7.2) and the
 * 7-step campaign create form (PRD §7.4). Renders a segmented track where
 * completed/current segments fill with the accent color, plus an optional
 * "Step N of M" label. Animated width transitions keep step changes smooth.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/components/ThemeProvider';

export type StepperProgressProps = {
  /** 1-based current step. */
  current: number;
  /** Total number of steps. */
  total: number;
  /** Show the "Step N of M" caption above the track. */
  showLabel?: boolean;
  /** Optional per-step title shown next to the caption. */
  stepTitle?: string;
  style?: ViewStyle;
};

export function StepperProgress({ current, total, showLabel = true, stepTitle, style }: StepperProgressProps) {
  const { colors } = useTheme();
  const clamped = Math.max(1, Math.min(current, total));

  return (
    <View style={style}>
      {showLabel && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>
            Step {clamped} of {total}
          </Text>
          {stepTitle && (
            <Text style={{ fontSize: 13, color: colors.text3 }} numberOfLines={1}>
              {stepTitle}
            </Text>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <Segment key={i} filled={i < clamped} color={colors.accent} track={colors.cardSunk} />
        ))}
      </View>
    </View>
  );
}

function Segment({ filled, color, track }: { filled: boolean; color: string; track: string }) {
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [filled, progress]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 3 }, fillStyle]} />
    </View>
  );
}
