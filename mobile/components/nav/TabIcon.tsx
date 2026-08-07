/**
 * Bottom-tab glyphs, shared by the creator and business tab bars so the two roles
 * never drift apart.
 *
 * These are the only icons in the app that don't come from `components/ui/Icon` —
 * on purpose. A tab bar needs a *filled* counterpart for the selected state (tint
 * alone is not an accessible selection signal), and hand-drawing a second variant
 * for five glyphs is exactly the kind of thing an icon library already solved.
 * Phosphor ships `regular` and `fill` cut from the same drawing, so the swap is one
 * prop. Every other glyph in the app still comes from the in-house set.
 *
 * Phosphor draws through `react-native-svg`, which the app already depends on, so
 * this adds no native module and needs no rebuild.
 */
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import type { ColorValue } from 'react-native';

type TabIconProps = { focused: boolean; color: ColorValue; size: number };

/**
 * Wrap a Phosphor glyph as a `tabBarIcon` renderer: outline when idle, filled when
 * selected. Expo Router passes `focused`, which the previous helper discarded — that
 * was why selection read as a colour change and nothing else.
 */
export function tabIcon(Glyph: PhosphorIcon) {
  return function TabBarGlyph({ focused, color, size }: TabIconProps) {
    return <Glyph color={color as string} size={size} weight={focused ? 'fill' : 'regular'} />;
  };
}
