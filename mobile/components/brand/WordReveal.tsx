/**
 * Staggered text reveal, one **word** at a time.
 *
 * Not per-character, and that isn't a stylistic call — it's a correctness one. The
 * app ships in India, and `[...text]` / `split('')` shatters Devanagari and Tamil
 * grapheme clusters (a base consonant and its vowel sign would animate apart) and
 * splits emoji surrogate pairs in half — the 👋 in "Prem 👋" would render as two
 * broken glyphs. Splitting on whitespace is safe in every script we support.
 */
import { Text, View, type TextStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { DURATION, EASE, WORD_STAGGER_MS } from '@/lib/motion';

function Word({ text, style, delay }: { text: string; style?: TextStyle; delay: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: DURATION.slow, easing: EASE.out }));
  }, [delay, t]);

  const animated = useAnimatedStyle(() => ({
    // Opacity is front-loaded (done by 55% of the move) so the word is readable
    // while it's still settling, rather than arriving and *then* becoming legible.
    opacity: interpolate(t.value, [0, 0.55], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [14, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={animated}>
      <Text style={style}>{text}</Text>
    </Animated.View>
  );
}

export function WordReveal({
  text,
  style,
  delay = 0,
  /** When false, the text renders immediately with no motion (reduced motion, or a replay guard). */
  animate = true,
  numberOfLines,
}: {
  text: string;
  style?: TextStyle;
  delay?: number;
  animate?: boolean;
  numberOfLines?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  if (reduced || !animate || words.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {words.map((w, i) => (
        <View key={`${w}-${i}`} style={{ flexDirection: 'row' }}>
          <Word text={w} style={style} delay={delay + i * WORD_STAGGER_MS} />
          {i < words.length - 1 ? <Text style={style}> </Text> : null}
        </View>
      ))}
    </View>
  );
}
