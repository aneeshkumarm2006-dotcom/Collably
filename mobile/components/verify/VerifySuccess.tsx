/**
 * The shared "you're verified" moment, reused by every verification flow.
 *
 * A check springs into an accent disc, confetti bursts (the app's own `Confetti`,
 * which self-disables under Reduce Motion), then a headline, an optional detail
 * line (e.g. a verified follower count), and a single Done button.
 */
import { type ReactNode, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti, Icon } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/ThemeProvider';
import { BRAND_SPRING } from '@/lib/motion';

export function VerifySuccess({
  title,
  detail,
  onDone,
  doneLabel = 'Done',
}: {
  title: string;
  detail?: ReactNode;
  onDone: () => void;
  doneLabel?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const pop = useSharedValue(reduced ? 1 : 0);
  const rise = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    pop.value = withSpring(1, BRAND_SPRING);
    rise.value = withTiming(1, { duration: 400 });
  }, [reduced, pop, rise]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 12 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Confetti />

      <Animated.View
        style={[
          {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          },
          discStyle,
        ]}
      >
        <Icon name="check" size={52} color="#fff" strokeWidth={2.6} />
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center', marginTop: 28 }, textStyle]}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, textAlign: 'center' }}>
          {title}
        </Text>
        {detail ? (
          <View style={{ marginTop: 10, alignItems: 'center' }}>{detail}</View>
        ) : null}
      </Animated.View>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 20 }}>
        <Button block size="lg" onPress={onDone}>
          {doneLabel}
        </Button>
      </View>
    </View>
  );
}
