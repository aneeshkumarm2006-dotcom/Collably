/**
 * Boot splash bridge (Phase 9).
 *
 * `/` is the initial route. The native splash stays up until the root layout has
 * loaded fonts + hydrated the session; the auth gate then `replace()`s into the
 * correct route group. This screen only shows in the brief window between splash
 * hide and that redirect, so it's a minimal themed spinner matching the splash —
 * no flash of content, no decisions of its own.
 */
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from '@/components/ui';

export default function BootScreen() {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
      <View
        className="h-20 w-20 items-center justify-center rounded-3xl"
        style={{ backgroundColor: colors.accent }}
      >
        <Icon name="gift" size={38} color={colors.accentText} />
      </View>
      <Text className="mt-5 text-2xl font-extrabold" style={{ color: colors.text }}>
        Collably
      </Text>
      <ActivityIndicator className="mt-6" size="small" color={colors.accent} />
    </View>
  );
}
