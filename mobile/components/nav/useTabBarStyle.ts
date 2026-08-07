/**
 * Shared bottom-tab bar styling for all three role layouts (creator, business,
 * admin), so they can't drift apart.
 *
 * Why this exists rather than an inline `tabBarStyle`: the bar has to paint its own
 * background all the way through the bottom safe-area inset.
 *
 * Android 15+ forces edge-to-edge (Expo 54 / RN 0.81), so the system gesture strip is
 * transparent and the app draws behind it. With only `backgroundColor` set, the tab
 * bar filled its own frame and the inset strip below it did not, which rendered as
 * TWO stacked bars — the tab row in one shade and a band under it in another.
 * Extending the height by `insets.bottom` and padding the content back up by the same
 * amount means one continuous surface, with the icons still sitting above the gesture
 * area rather than under it.
 *
 * iOS gets the same treatment for free: the home-indicator inset is handled by the
 * identical maths, so the two platforms stay visually in step.
 */
import { Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';

/** Height of the icon + label row itself, before any safe-area inset. */
const BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 52 : 58;

export function useTabBarStyle(): ViewStyle {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.hair,
    borderTopWidth: 1,
    height: BAR_CONTENT_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom,
    paddingTop: 6,
  };
}
