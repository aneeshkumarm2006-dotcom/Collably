/**
 * Immersive "story panel" onboarding shell (Direction C). Renders a full-screen
 * cinematic canvas — a Ken-Burns gradient background with a legibility scrim — and
 * drives one panel at a time: a story-style progress bar + circular back up top,
 * the active panel body (keyed by `index`, slid in directionally), and an optional
 * confetti burst on the final reveal.
 *
 * The shell owns chrome + transitions only; each panel body (passed as children)
 * brings its own headline/answers/action via the StoryKit `StoryPanel`. Motion
 * respects reduce-motion. No exit until the flow completes (the `(onboarding)`
 * stack disables the back gesture).
 */
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, View, useWindowDimensions } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryBackButton, StoryProgress, type Grad } from './StoryKit';

const ABS_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

export type StoryOnboardingProps = {
  /** 0-based panel index. */
  index: number;
  total: number;
  /** Background gradient for the current panel (cross-fades on change). */
  gradient: Grad;
  /** Omit on the first panel to hide Back. */
  onBack?: () => void;
  /** Fire the confetti reveal. */
  celebrate?: boolean;
  children: React.ReactNode;
};

export function StoryOnboarding({ index, total, gradient, onBack, celebrate = false, children }: StoryOnboardingProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const prev = useRef(index);
  const forward = index >= prev.current;
  // Update the ref after commit (not during render) so Strict Mode's double
  // render doesn't corrupt the forward/back direction.
  useEffect(() => {
    prev.current = index;
  }, [index]);
  const Enter = forward ? FadeInRight : FadeInLeft;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <KenBurns gradient={gradient} reduced={reduced} />
      {/* legibility scrim — darken top + bottom so white chrome/text reads */}
      <LinearGradient
        colors={['rgba(8,8,14,0.42)', 'rgba(8,8,14,0.12)', 'rgba(8,8,14,0.82)']}
        locations={[0, 0.4, 1]}
        style={ABS_FILL}
        pointerEvents="none"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* progress + back */}
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            {onBack ? <StoryBackButton onPress={onBack} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <StoryProgress current={index + 1} total={total} />
          </View>
        </View>

        {/* active panel */}
        <View style={{ flex: 1, paddingBottom: insets.bottom + 12 }}>
          <Reanimated.View key={index} entering={Enter.duration(320)} style={{ flex: 1 }}>
            {children}
          </Reanimated.View>
        </View>
      </KeyboardAvoidingView>

      {celebrate ? <Confetti /> : null}
    </View>
  );
}

// ── Ken-Burns gradient background ────────────────────────────────────────────
function KenBurns({ gradient, reduced }: { gradient: Grad; reduced: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    scale.value = 1;
    scale.value = withRepeat(withTiming(1.14, { duration: 9000, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(scale);
  }, [reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : scale.value }] }));

  return (
    <Reanimated.View key={gradient.join('-')} entering={reduced ? undefined : FadeInRight.duration(500)} style={ABS_FILL}>
      <Reanimated.View style={[ABS_FILL, style]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ABS_FILL} />
      </Reanimated.View>
    </Reanimated.View>
  );
}

// ── confetti burst (no external lib) ─────────────────────────────────────────
const CONFETTI_COLORS = ['#FF5EA0', '#FFD43B', '#2D88FF', '#16C79A', '#FF7A45', '#8B5CF6'];
const CONFETTI_COUNT = 22;

function Confetti() {
  const { width, height } = useWindowDimensions();
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
