/**
 * Primary action button, ported from the design reference's `Button`.
 *
 * Variants map to the brand palette (solid green, tonal, outline, ghost, success,
 * money, danger). Supports leading/trailing icons, three sizes, full-width `block`,
 * and a `loading` spinner. Colors come from `useTheme()` so light/dark stay in sync.
 */
import { ActivityIndicator, Text, type PressableProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/ThemeProvider';
import { PressableScale } from './PressableScale';
import { useOnDarkSurface } from './DarkSurface';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'solid' | 'outline' | 'tonal' | 'ghost' | 'success' | 'money' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

const SIZES: Record<ButtonSize, { padV: number; padH: number; fontSize: number }> = {
  sm: { padV: 8, padH: 14, fontSize: 14 },
  md: { padV: 12, padH: 18, fontSize: 15.5 },
  lg: { padV: 15, padH: 22, fontSize: 17 },
};

export function Button({
  children,
  variant = 'solid',
  size = 'md',
  block,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  onPress,
}: ButtonProps) {
  const { colors } = useTheme();
  const onDark = useOnDarkSurface();
  const { padV, padH, fontSize } = SIZES[size];

  const variants: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    solid: { bg: colors.accent, fg: colors.accentText },
    outline: { bg: 'transparent', fg: colors.text, border: colors.hairStrong },
    tonal: { bg: colors.accentSoft, fg: colors.accent },
    ghost: { bg: 'transparent', fg: colors.accent },
    success: { bg: colors.success, fg: '#fff' },
    money: { bg: colors.money, fg: '#fff' },
    danger: { bg: 'transparent', fg: colors.danger, border: `${colors.danger}33` },
  };
  const v = variants[variant];
  const isDisabled = disabled || loading;

  // On the cinematic dark ground, the primary (solid) action becomes the blue
  // gradient "pill" from the onboarding NextPill: a #2D88FF→#1877F2 fill with a
  // soft blue glow, or a muted translucent fill when disabled. Other variants keep
  // the (dark-palette) theme colors. Off the dark ground, behavior is unchanged.
  const darkPill = onDark && variant === 'solid';
  const fg = darkPill ? (isDisabled ? 'rgba(255,255,255,0.35)' : '#fff') : v.fg;

  // Static (non-function) style array — NativeWind v4 drops function-form styles
  // on core components. Press feedback (spring scale) is handled by PressableScale.
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: block ? 'stretch' : 'flex-start',
    width: block ? '100%' : undefined,
    paddingVertical: darkPill ? padV + 1 : padV,
    paddingHorizontal: padH,
    borderRadius: darkPill ? 18 : 13,
    backgroundColor: darkPill ? (isDisabled ? 'rgba(255,255,255,0.08)' : 'transparent') : v.bg,
    borderWidth: !darkPill && v.border ? 1.5 : 0,
    borderColor: v.border,
    // Blue glow behind the active pill (iOS; Android uses the gradient fill).
    ...(darkPill && !isDisabled
      ? { shadowColor: '#2D88FF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }
      : {}),
  };

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={[base, { opacity: isDisabled && !darkPill ? 0.45 : 1 }]}
    >
      {darkPill && !isDisabled ? (
        <LinearGradient
          colors={['#2D88FF', '#1877F2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 18 }}
          pointerEvents="none"
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={fontSize + 2} color={fg} strokeWidth={2} />}
          <Text style={{ color: fg, fontSize, fontWeight: darkPill ? '800' : '600', letterSpacing: -0.2 }}>{children}</Text>
          {iconRight && <Icon name={iconRight} size={fontSize + 1} color={fg} strokeWidth={2.1} />}
        </>
      )}
    </PressableScale>
  );
}
