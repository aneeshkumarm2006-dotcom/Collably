/**
 * Surface container — the white rounded card used everywhere. Renders a hairline
 * border + soft shadow from the theme. Pass `onPress` to make it a tappable row
 * (adds press feedback); otherwise it's a plain `View`.
 */
import { View, type PressableProps, type ViewProps, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';

export type CardProps = {
  children: React.ReactNode;
  /** Tappable card — switches to a Pressable with press opacity. */
  onPress?: PressableProps['onPress'];
  /** Inner padding (px). Default 16. Pass 0 for edge-to-edge media. */
  padding?: number;
  /** Use the stronger elevation preset (e.g. modals, featured cards). */
  elevated?: boolean;
  /** Sunken (recessed) variant — no shadow, sunk background. */
  sunken?: boolean;
  style?: ViewStyle;
} & Pick<ViewProps, 'accessibilityLabel'>;

export function Card({ children, onPress, padding = 16, elevated, sunken, style, ...rest }: CardProps) {
  const { colors, shadows } = useTheme();

  const base: ViewStyle = {
    backgroundColor: sunken ? colors.cardSunk : colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: 16,
    padding,
    ...(sunken ? {} : elevated ? shadows.cardStrong : shadows.card),
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}
