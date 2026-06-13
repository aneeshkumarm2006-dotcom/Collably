/**
 * Primary action button, ported from the design reference's `Button`.
 *
 * Variants map to the brand palette (solid green, tonal, outline, ghost, success,
 * money, danger). Supports leading/trailing icons, three sizes, full-width `block`,
 * and a `loading` spinner. Colors come from `useTheme()` so light/dark stay in sync.
 */
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
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

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: block ? 'stretch' : 'flex-start',
        width: block ? '100%' : undefined,
        paddingVertical: padV,
        paddingHorizontal: padH,
        borderRadius: 13,
        backgroundColor: v.bg,
        borderWidth: v.border ? 1.5 : 0,
        borderColor: v.border,
        opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={fontSize + 2} color={v.fg} strokeWidth={2} />}
          <Text style={{ color: v.fg, fontSize, fontWeight: '600', letterSpacing: -0.2 }}>{children}</Text>
          {iconRight && <Icon name={iconRight} size={fontSize + 1} color={v.fg} strokeWidth={2.1} />}
        </>
      )}
    </Pressable>
  );
}
