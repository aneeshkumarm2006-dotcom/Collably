/**
 * "Continue with Apple" button (App Store Guideline 4.8). Mirrors `GoogleButton`:
 * the Apple mark is drawn inline via `react-native-svg` (the app's stroke icon set
 * has no brand logos), and the native module is deliberately NOT imported here — the
 * sign-in call lives in `useAppleSignIn`, which loads it lazily. That keeps a binary
 * without the module from red-screening the auth screens.
 *
 * Styling follows Apple's Human Interface Guidelines for Sign in with Apple: a solid
 * black button with the white Apple mark and white label in light mode, inverted to
 * white-on-black in dark mode (Apple permits either; the rule is high contrast
 * against the background and an unmodified mark).
 *
 * Render only when `useAppleSignIn().available` is true (iOS, supported version).
 */
import { ActivityIndicator, Text } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/components/ThemeProvider';

function AppleMark({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 814 1000">
      <Path
        fill={color}
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </Svg>
  );
}

export type AppleButtonProps = {
  onPress: () => void;
  loading?: boolean;
  /** Disabled while another auth action (e.g. email login) is running. */
  disabled?: boolean;
};

export function AppleButton({ onPress, loading = false, disabled = false }: AppleButtonProps) {
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;
  // HIG: black-on-light, white-on-dark. Either is allowed; contrast is the rule.
  const bg = isDark ? '#FFFFFF' : '#000000';
  const fg = isDark ? '#000000' : '#FFFFFF';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: isDark ? colors.hairStrong : '#000000',
        backgroundColor: bg,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          <AppleMark color={fg} />
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: fg, letterSpacing: -0.2 }}>
            Continue with Apple
          </Text>
        </>
      )}
    </Pressable>
  );
}
