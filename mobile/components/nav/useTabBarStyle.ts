/**
 * Shared bottom-tab bar styling for all three role layouts (creator, business,
 * admin), so they can't drift apart.
 *
 * Colours ONLY. Do not add height or safe-area padding here.
 *
 * React Navigation 7's `BottomTabBar` already handles the bottom inset itself, in
 * three places (see its BottomTabBar.js): the computed `tabBarHeight` is derived
 * from `insets`, the content container gets `paddingBottom: spacing + insets.bottom`,
 * and the bar gets `paddingBottom: insets.bottom`. Adding
 * `height: CONTENT + insets.bottom` plus `paddingBottom: insets.bottom` on top of
 * that counts the inset twice, and the surplus is painted in `tabBarStyle`'s
 * background — which renders as an empty second bar stacked under the labels.
 *
 * That is exactly the bug this file previously caused. If the bar ever needs to be
 * taller, set `height` alone and leave the padding to the library.
 */
import type { ViewStyle } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';

export function useTabBarStyle(): ViewStyle {
  const { colors } = useTheme();

  return {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.hair,
    borderTopWidth: 1,
  };
}
