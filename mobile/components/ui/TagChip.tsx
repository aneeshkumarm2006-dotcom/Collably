/**
 * Compact chip used for tags, categories, and filter rows. Two modes:
 *   - static label (default)
 *   - interactive (`onPress`) — toggles selected styling and fires `onPress`; used
 *     for the multi-select chip rows in onboarding (niches, content types, category)
 *     and filters.
 *
 * The interactive chip is the primary "premium" selection affordance in the
 * onboarding wizard, so it animates (Reanimated): a spring pop + color fill on
 * select, a check that slides in, and a subtle scale-down on press. The static
 * chip stays a plain view (no hooks, no motion). For multi-select rows, render a
 * list and lift the `selected` state.
 */
import { useEffect, useRef } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type TagChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  /** When provided, the chip becomes a toggle button with press feedback. */
  onPress?: () => void;
  /** Smaller, denser chip (used in tight meta rows). */
  small?: boolean;
  style?: ViewStyle;
};

export function TagChip(props: TagChipProps) {
  // Split into two components so Reanimated hooks stay unconditional: the static
  // chip (no onPress) renders a plain view; the toggle chip owns the animation.
  return props.onPress ? <ToggleChip {...props} /> : <StaticChip {...props} />;
}

function StaticChip({ label, icon, selected = false, small = false, style }: TagChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.accent : colors.text2;
  return (
    <View style={[baseStyle(colors, selected, small), style]}>
      {icon && <Icon name={icon} size={small ? 13 : 15} color={fg} strokeWidth={1.8} />}
      <Text style={{ color: fg, fontSize: small ? 12.5 : 13.5, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function ToggleChip({ label, icon, selected = false, onPress, small = false, style }: TagChipProps) {
  const { colors } = useTheme();

  // sel: 0→1 selection progress (drives color + check). pop: transient overshoot
  // on select. press: 0→1 finger-down scale-down. Skip the pop on first mount so
  // pre-selected chips appear settled rather than animating in.
  const sel = useSharedValue(selected ? 1 : 0);
  const pop = useSharedValue(1);
  const press = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      sel.value = selected ? 1 : 0;
      return;
    }
    sel.value = withTiming(selected ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
    if (selected) {
      pop.value = withSequence(
        withTiming(1.07, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 11, stiffness: 240, mass: 0.5 }),
      );
    }
  }, [selected, sel, pop]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], [colors.card, colors.accentSoft]),
    borderColor: interpolateColor(sel.value, [0, 1], [colors.hair, colors.accent]),
    transform: [{ scale: pop.value * (1 - press.value * 0.05) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text2, colors.accent]),
  }));

  // The check animates its width + margin so siblings slide over smoothly instead
  // of snapping when it appears/disappears (base has no `gap` for this reason).
  const checkSize = small ? 13 : 15;
  const checkStyle = useAnimatedStyle(() => ({
    width: sel.value * checkSize,
    marginRight: sel.value * 5,
    opacity: sel.value,
    transform: [{ scale: 0.55 + sel.value * 0.45 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 150 });
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Animated.View style={[baseStyle(colors, false, small), containerStyle, style]}>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, checkStyle]}>
          <Icon name="check" size={checkSize} color={colors.accent} strokeWidth={2.6} />
        </Animated.View>
        {icon && (
          <View style={{ marginRight: 5 }}>
            <Icon name={icon} size={small ? 13 : 15} color={colors.accent} strokeWidth={1.8} />
          </View>
        )}
        <Animated.Text style={[{ fontSize: small ? 12.5 : 13.5, fontWeight: '600' }, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** Shared chip frame. Colors are omitted on the animated chip (driven by Reanimated). */
function baseStyle(
  colors: ReturnType<typeof useTheme>['colors'],
  withColors: boolean,
  small: boolean,
): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: small ? 5 : 7,
    paddingHorizontal: small ? 10 : 13,
    ...(withColors
      ? { backgroundColor: colors.accentSoft, borderColor: colors.accent }
      : { backgroundColor: colors.card, borderColor: colors.hair }),
  };
}
