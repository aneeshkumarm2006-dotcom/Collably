/**
 * Confetti burst (no external lib) — a full-screen, non-interactive overlay of
 * coloured pieces that fall + drift + rotate, then fade. Used for celebratory
 * moments: the onboarding "reveal" and the "you're verified" approval popup.
 *
 * The spread is deterministic per piece index (no `Math.random`) so it's stable
 * across renders. Mount it conditionally — each mount replays the burst once.
 */
import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const ABS_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const CONFETTI_COLORS = ['#FF5EA0', '#FFD43B', '#2D88FF', '#16C79A', '#FF7A45', '#8B5CF6'];
const CONFETTI_COUNT = 22;

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  // Honour the OS "Reduce Motion" setting — skip the falling-confetti animation
  // entirely (the celebration card/message still shows around it).
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={[ABS_FILL, { overflow: 'hidden' }]}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} i={i} screenW={width} screenH={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({ i, screenW, screenH }: { i: number; screenW: number; screenH: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(i * 35, withTiming(1, { duration: 1500 + (i % 5) * 160, easing: Easing.out(Easing.quad) }));
  }, [p, i]);

  // Deterministic per-index spread (no Math.random so it's stable across renders).
  const startX = (i / CONFETTI_COUNT) * screenW;
  const drift = (i % 2 ? 1 : -1) * (38 + (i % 5) * 20);
  const totalRot = (i % 2 ? 1 : -1) * (320 + i * 18);
  const size = 8 + (i % 3) * 3;
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + drift * p.value },
      { translateY: -40 + screenH * 0.92 * p.value },
      { rotate: `${totalRot * p.value}deg` },
    ],
    opacity: 1 - Math.max(0, (p.value - 0.72) / 0.28),
  }));

  return <Reanimated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size * 1.5, borderRadius: 2, backgroundColor: color }, style]} />;
}
