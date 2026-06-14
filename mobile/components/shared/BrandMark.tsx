/**
 * Collably brand lockup — a green rounded-square gift mark, optionally followed by
 * the "Collably" wordmark. Used on the auth screens and anywhere the brand needs
 * to appear inline (matches the design's BrandMark placement above auth titles).
 */
import { Text, View } from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';

export type BrandMarkProps = {
  /** Size of the square mark in px. */
  size?: number;
  /** Show the "Collably" wordmark next to the mark. */
  wordmark?: boolean;
  /** Override the mark color (defaults to the brand green). */
  color?: string;
};

export function BrandMark({ size = 44, wordmark = false, color }: BrandMarkProps) {
  const { colors } = useTheme();
  const bg = color ?? colors.brandGreen;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="gift" size={size * 0.52} color="#fff" />
      </View>
      {wordmark ? (
        <Text style={{ fontSize: size * 0.46, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>Collably</Text>
      ) : null}
    </View>
  );
}
