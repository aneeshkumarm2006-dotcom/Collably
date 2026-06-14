/**
 * Compact chip used for tags, categories, and filter rows. Two modes:
 *   - static label (default)
 *   - `selectable` — toggles selected styling and fires `onPress`; used for the
 *     multi-select chip rows in onboarding (niches, content types) and filters.
 *
 * For multi-select rows, render a list of these and lift the `selected` state.
 */
import { Text, View, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type TagChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  /** When provided, the chip becomes a toggle button with press feedback. */
  onPress?: () => void;
  /** Smaller, denser chip (used in tight meta rows). */
  small?: boolean;
  style?: ViewStyle;
};

export function TagChip({ label, icon, selected = false, onPress, small = false, style }: TagChipProps) {
  const { colors } = useTheme();

  const fg = selected ? colors.accent : colors.text2;
  const content = (
    <>
      {icon && <Icon name={icon} size={small ? 13 : 15} color={fg} strokeWidth={1.8} />}
      <Text style={{ color: fg, fontSize: small ? 12.5 : 13.5, fontWeight: '600' }}>{label}</Text>
    </>
  );

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: selected ? colors.accentSoft : colors.card,
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.hair,
    borderRadius: 999,
    paddingVertical: small ? 5 : 7,
    paddingHorizontal: small ? 10 : 13,
    ...style,
  };

  if (!onPress) {
    return <View style={base}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }]}
    >
      {content}
    </Pressable>
  );
}
