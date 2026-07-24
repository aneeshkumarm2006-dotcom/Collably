/**
 * Boot splash — the Local Creator Crew brand intro.
 *
 * `/` is the initial route. The native splash stays up until the root layout has
 * loaded fonts + hydrated the session; the auth gate then `replace()`s into the
 * correct route group. This screen owns the window in between, and it earns that
 * window: the connector mark draws itself on, then the wordmark and caption rise
 * under it.
 *
 * The animation is deliberately **not** extra time. The app already held a static
 * splash here for a fixed minimum (see `SPLASH_MIN_MS` in `_layout.tsx`); that dead
 * wait is now shorter *and* has something in it.
 */
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedBrandMark, StaticBrandMark } from '@/components/brand/AnimatedBrandMark';
import { DURATION, EASE } from '@/lib/motion';

const INK = '#FFFFFF';

/** How long the mark takes to draw. Kept in step with SPLASH_MIN_MS in _layout. */
const DRAW_MS = DURATION.brand + 140;

export default function BootScreen() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const progress = useSharedValue(0);
  const tail = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      tail.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: DRAW_MS, easing: EASE.out });
    // The wordmark follows the mark rather than racing it — the mark is the subject.
    tail.value = withDelay(DRAW_MS * 0.62, withTiming(1, { duration: DURATION.base, easing: EASE.out }));
  }, [reduced, progress, tail]);

  const tailStyle = useAnimatedStyle(() => ({
    opacity: tail.value,
    transform: [
      { translateY: interpolate(tail.value, [0, 1], [8, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <LinearGradient
      colors={[colors.brandYellow, colors.brandYellowDeep]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ alignItems: 'center', gap: 14 }}>
        {reduced ? (
          <StaticBrandMark size={60} color={INK} bg={colors.brandYellow} />
        ) : (
          <AnimatedBrandMark progress={progress} size={60} color={INK} bg={colors.brandYellow} />
        )}

        <Animated.View style={reduced ? undefined : tailStyle}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: INK, letterSpacing: -0.9 }}>
            Local Creator Crew
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(DRAW_MS).duration(DURATION.base)}
        style={{ position: 'absolute', bottom: 72, alignItems: 'center' }}
      >
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1.4,
            color: 'rgba(255,255,255,0.62)',
            fontWeight: '600',
          }}
        >
          LOCAL COLLAB MARKETPLACE
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}
