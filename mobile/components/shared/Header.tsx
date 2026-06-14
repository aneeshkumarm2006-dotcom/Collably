/**
 * Screen header bar. Handles the safe-area top inset, an optional back button,
 * a title (+ optional subtitle), and a flexible `right` slot (e.g. a
 * `NotificationBell` or an action button). Two visual styles: `plain` (sits on
 * the page background) and `card` (elevated surface with a hairline bottom border).
 */
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from '@/components/ui';

export type HeaderProps = {
  title?: string;
  subtitle?: string;
  /** Show a back chevron and call this on press. */
  onBack?: () => void;
  /** Right-aligned content (bell, action button, etc.). */
  right?: React.ReactNode;
  variant?: 'plain' | 'card';
  /** Large editorial title (left-aligned, bigger) instead of a centered bar title. */
  large?: boolean;
  style?: ViewStyle;
};

export function Header({ title, subtitle, onBack, right, variant = 'plain', large = false, style }: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: variant === 'card' ? colors.bgElev : 'transparent',
        borderBottomWidth: variant === 'card' ? 1 : 0,
        borderBottomColor: colors.hair,
        ...style,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => ({ marginRight: 8, marginLeft: -4, padding: 4, opacity: pressed ? 0.6 : 1 })}
          >
            {/* Android uses a back arrow; iOS uses a chevron (platform-native). */}
            <Icon name={Platform.OS === 'android' ? 'arrowL' : 'chevL'} size={Platform.OS === 'android' ? 23 : 24} color={colors.text} strokeWidth={2} />
          </Pressable>
        )}

        <View style={{ flex: 1 }}>
          {title && (
            <Text
              numberOfLines={1}
              style={{
                fontSize: large ? 26 : 18,
                fontWeight: '700',
                color: colors.text,
                letterSpacing: large ? -0.6 : -0.3,
              }}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </View>

        {right && <View style={{ marginLeft: 12 }}>{right}</View>}
      </View>
    </View>
  );
}
