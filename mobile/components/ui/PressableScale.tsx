/**
 * The app-wide tactile press surface: a Pressable that springs its scale down on
 * touch (and dims slightly), instead of the old flat opacity-only feedback. This
 * single primitive is what makes cards/buttons/tiles feel "alive" and high-end —
 * adopt it anywhere something is tappable.
 *
 * Honours the OS "Reduce Motion" setting: it drops the scale spring and keeps a
 * subtle opacity dim, so motion-sensitive users still get clear press feedback.
 *
 * IMPORTANT: the touch `Pressable` is kept STYLE-LESS. NativeWind v4's cssInterop
 * mangles/drops the `style` on a core Pressable (esp. when wrapped by Reanimated's
 * `createAnimatedComponent`), which stripped Card/Button layout and made text
 * overflow everywhere. So the visual style + scale live on a plain inner
 * `Reanimated.View` (NativeWind-safe), and the Pressable just handles touches.
 */
import { forwardRef, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PRESS_SCALE, PRESS_SPRING } from '@/lib/motion';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale target while pressed. Default 0.97. */
  scaleTo?: number;
  children?: ReactNode;
};

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, scaleTo = PRESS_SCALE, onPressIn, onPressOut, children, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Under normal motion we drive ONLY scale, so we never clobber a consumer's
  // base opacity (e.g. a disabled button's 0.45 dim). Under reduce-motion we fall
  // back to an opacity dip — scale stays put — to still signal the press.
  const animatedStyle = useAnimatedStyle(() =>
    reduced ? { opacity: opacity.value } : { transform: [{ scale: scale.value }] },
  );

  return (
    <Pressable
      ref={ref}
      onPressIn={(e) => {
        if (reduced) opacity.value = withTiming(0.85, { duration: 90 });
        else scale.value = withSpring(scaleTo, PRESS_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (reduced) opacity.value = withTiming(1, { duration: 130 });
        else scale.value = withSpring(1, PRESS_SPRING);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Reanimated.View style={[style, animatedStyle]}>{children}</Reanimated.View>
    </Pressable>
  );
});
