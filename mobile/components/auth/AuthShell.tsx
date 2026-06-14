/**
 * Shared layout for the auth screens (PRD §7.1). A keyboard-avoiding, scrollable
 * page with the safe-area handled, an optional back button, and a titled header
 * (with subtitle). Keeps login / signup / forgot / reset visually consistent and
 * out of the way of the on-screen keyboard.
 */
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from '@/components/ui';
import { BrandMark } from '@/components/shared';

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  /** Pinned footer content (e.g. "Don't have an account?") below the scroll area. */
  footer?: React.ReactNode;
  /** Show the CollabSpace brand mark above the title (default true). */
  brand?: boolean;
};

export function AuthShell({ title, subtitle, onBack, children, footer, brand = true }: AuthShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              marginLeft: -8,
              marginBottom: 8,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name={Platform.OS === 'android' ? 'arrowL' : 'chevL'} size={Platform.OS === 'android' ? 24 : 26} color={colors.text} strokeWidth={2} />
          </Pressable>
        )}

        {brand && (
          <View style={{ marginBottom: 20 }}>
            <BrandMark size={44} />
          </View>
        )}

        <Text className="text-3xl font-extrabold" style={{ color: colors.text, letterSpacing: -0.6 }}>
          {title}
        </Text>
        {subtitle && (
          <Text className="mt-2 text-base" style={{ color: colors.text2, lineHeight: 22 }}>
            {subtitle}
          </Text>
        )}

        <View className="mt-8">{children}</View>

        {footer && <View className="mt-auto pt-8">{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
