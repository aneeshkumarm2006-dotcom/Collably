/**
 * CollabSpace brand lockup — the design's connector mark (an outlined rounded
 * square with two horizontal lines and a small ring node on the left & right
 * edges), optionally followed by the "CollabSpace" wordmark.
 *
 * This is the real design glyph (see `onboarding.jsx` BrandMark in the handoff) —
 * NOT a gift box. Stroke + wordmark color default to the theme text color; pass
 * `color`/`wordmarkColor` to invert on a colored hero, and `bg` to fill the edge
 * nodes so they read as distinct dots against that background.
 */
import { Text, View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/components/ThemeProvider';

/** The connector glyph alone (no wordmark). */
export function CollabMark({ size = 44, color, bg = 'transparent', strokeWidth }: { size?: number; color?: string; bg?: string; strokeWidth?: number }) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  // viewBox 30×24: square spans x3.5..26.5, edge nodes centred on those edges.
  const sw = strokeWidth ?? 2.1;
  return (
    <Svg width={size * (30 / 24)} height={size} viewBox="0 0 30 24" fill="none">
      <Rect x={3.5} y={2} width={23} height={20} rx={5.5} stroke={stroke} strokeWidth={sw} />
      <Path d="M10.5 9.5h9M10.5 14.5h9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <Circle cx={3.5} cy={12} r={2.6} fill={bg} stroke={stroke} strokeWidth={sw} />
      <Circle cx={26.5} cy={12} r={2.6} fill={bg} stroke={stroke} strokeWidth={sw} />
    </Svg>
  );
}

export type BrandMarkProps = {
  /** Height of the square mark in px. */
  size?: number;
  /** Show the "CollabSpace" wordmark next to the mark. */
  wordmark?: boolean;
  /** Stroke color of the mark (defaults to the theme text color). */
  color?: string;
  /** Wordmark text color (defaults to `color` ?? theme text color). */
  wordmarkColor?: string;
  /** Fill for the two edge nodes — set to the surrounding bg so they read as dots. */
  bg?: string;
};

export function BrandMark({ size = 44, wordmark = false, color, wordmarkColor, bg }: BrandMarkProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <CollabMark size={size} color={stroke} bg={bg} />
      {wordmark ? (
        <Text style={{ fontSize: size * 0.56, fontWeight: '800', color: wordmarkColor ?? stroke, letterSpacing: -0.8 }}>Local Creator Crew</Text>
      ) : null}
    </View>
  );
}
