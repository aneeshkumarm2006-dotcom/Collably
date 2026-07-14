/**
 * The pull-to-refresh brand mark — drawn by the user's thumb.
 *
 * Rather than *replaying* a canned logo animation on every refresh (which front-loads
 * ~600ms onto a ~300ms fetch and makes refresh feel slower, not more premium), the
 * mark is **scrubbed**: its draw-on progress is the pull distance. The user's own
 * gesture powers it, so it costs zero added time and tracks the finger 1:1.
 *
 * Once the refresh actually fires, the mark holds complete and breathes until the
 * data lands.
 *
 * Platform note: the scrub is driven by *overscroll*, which iOS reports as a negative
 * content offset. Android has no negative overscroll (it uses a stretch effect), so
 * there the mark simply plays to full when the refresh begins — same mark, same
 * language, no gesture fight with the platform.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { AnimatedBrandMark } from './AnimatedBrandMark';
import { DURATION, EASE } from '@/lib/motion';

/** How far you must pull for the mark to finish drawing (px). */
export const PULL_DISTANCE = 88;

export function ScrubRefreshMark({
  pull,
  refreshing,
  size = 30,
  color = '#FFFFFF',
  bg = 'transparent',
}: {
  /** 0 → 1 pull progress, driven by the scroll handler. */
  pull: SharedValue<number>;
  refreshing: boolean;
  size?: number;
  color?: string;
  bg?: string;
}) {
  const reduced = useReducedMotion();
  /** Forces the mark complete while the refresh is in flight. */
  const settle = useSharedValue(0);
  /** A slow breath so a complete mark still reads as "working". */
  const breath = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      settle.value = withTiming(1, { duration: DURATION.fast, easing: EASE.out });
      if (!reduced) {
        breath.value = withRepeat(
          withTiming(1, { duration: 900, easing: EASE.inOut }),
          -1,
          true,
        );
      }
    } else {
      settle.value = withTiming(0, { duration: DURATION.instant });
      cancelAnimation(breath);
      breath.value = 0;
    }
    return () => cancelAnimation(breath);
  }, [refreshing, reduced, settle, breath]);

  // The mark is whichever is further along: the thumb, or the in-flight refresh.
  const progress = useDerivedValue(() => Math.max(pull.value, settle.value));

  const style = useAnimatedStyle(() => {
    const visible = interpolate(progress.value, [0, 0.08], [0, 1], Extrapolation.CLAMP);
    const pulse = interpolate(breath.value, [0, 1], [1, 0.62], Extrapolation.CLAMP);
    return { opacity: visible * pulse };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <View>
        <AnimatedBrandMark progress={progress} size={size} color={color} bg={bg} strokeWidth={2.3} />
      </View>
    </Animated.View>
  );
}
