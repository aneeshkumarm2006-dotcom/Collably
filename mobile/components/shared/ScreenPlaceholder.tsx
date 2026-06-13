/**
 * Scaffold screen placeholder (Phase 9).
 *
 * The route tree, auth gate, and role-based navigators are built in Phase 9 so the
 * whole app can be navigated end-to-end before any screen has its real content.
 * Each not-yet-built screen renders one of these — a centered, themed card naming
 * the screen and the phase that fills it in — so the navigation skeleton is
 * visibly working and obvious about what's still a stub.
 *
 * Phases 10–14 replace these one screen at a time.
 */
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';

export type ScreenPlaceholderProps = {
  /** Screen title (e.g. "Explore"). */
  title: string;
  /** Which TODO phase builds the real screen (e.g. "Phase 12"). */
  phase: string;
  /** Optional one-line description of what the screen will do. */
  subtitle?: string;
  /** Optional brand icon for the header glyph. */
  icon?: IconName;
};

export function ScreenPlaceholder({ title, phase, subtitle, icon = 'sparkles' }: ScreenPlaceholderProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View
          className="w-full max-w-md items-center rounded-2xl p-7"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.hair,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.4 : 0.08,
            shadowRadius: 18,
            elevation: 3,
          }}
        >
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <Icon name={icon} size={30} color={colors.accent} />
          </View>

          <Text className="mt-5 text-xl font-bold" style={{ color: colors.text }}>
            {title}
          </Text>

          {subtitle ? (
            <Text className="mt-1.5 text-center text-sm" style={{ color: colors.text2 }}>
              {subtitle}
            </Text>
          ) : null}

          <View
            className="mt-5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hair }}
          >
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.text3 }}>
              Built in {phase}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
