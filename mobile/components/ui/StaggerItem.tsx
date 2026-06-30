/**
 * Wraps a list row so it fades + rises into place, staggered by its index — kills
 * the "everything pops in at once" flatness on list loads. Delay is capped (see
 * lib/motion) so long lists don't crawl. Honours reduce-motion by falling back to
 * a plain fade with no translate.
 *
 * Use on modest / non-virtualized lists (ScrollView maps, short FlatLists). On a
 * long virtualized FlatList rows re-animate as they recycle into view, so prefer
 * it where the list fits a screen or two.
 */
import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { STAGGER_CAP, STAGGER_MS } from '@/lib/motion';

export function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const delay = Math.min(index, STAGGER_CAP) * STAGGER_MS;
  const entering = reduced
    ? FadeIn.duration(180).delay(delay)
    : FadeInDown.duration(300).delay(delay).easing(Easing.out(Easing.cubic));

  return (
    <Reanimated.View entering={entering} style={style}>
      {children}
    </Reanimated.View>
  );
}
