/**
 * Shared building blocks for the verification flows (email now; phone + Instagram
 * next). Modelled on the reference verification UI — a calm, single-purpose screen:
 * a back arrow + step dots, one big title, one primary action, a trust line, and
 * the 6-box code input.
 *
 * Brand-adapted to Meta-blue (not the reference's purple). Presentation only —
 * screens own the API wiring.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { Press } from '@/components/home';

/** A crisp accent focus ring (CSS-style box-shadow, RN 0.76+). Theme-aware alpha. */
function accentRing(isDark: boolean): string {
  return isDark ? '0px 0px 0px 4px rgba(45,136,255,0.22)' : '0px 0px 0px 4px rgba(24,119,242,0.12)';
}

// ── Step dots ─────────────────────────────────────────────────────────────────

/** Progress dots (the reference's "1/2 · 2/3"), the active one elongated. */
export function StepDots({ total, index }: { total: number; index: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const active = i === index;
        const done = i < index;
        return (
          <View
            key={i}
            style={{
              height: 6,
              width: active ? 20 : 6,
              borderRadius: 3,
              backgroundColor: active || done ? colors.accent : colors.hairStrong,
            }}
          />
        );
      })}
    </View>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

/** Full-screen verification shell: top bar (back + dots), body, footer. */
export function VerifyShell({
  onBack,
  step,
  steps,
  children,
  footer,
}: {
  onBack: () => void;
  /** 0-based current step; omit to hide the dots. */
  step?: number;
  steps?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.cardSunk,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevL" size={20} color={colors.text} strokeWidth={2.6} />
          </View>
        </Pressable>
        {typeof step === 'number' && typeof steps === 'number' ? (
          <StepDots total={steps} index={step} />
        ) : null}
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>{children}</View>

      {footer ? (
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** Big title + supporting subtitle at the top of a verify step. */
export function VerifyHeading({
  icon,
  title,
  subtitle,
}: {
  icon?: IconName;
  title: string;
  subtitle?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 26 }}>
      {icon ? (
        <LinearGradient
          colors={[colors.accent, colors.brandYellowDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            boxShadow: '0px 8px 18px rgba(24,119,242,0.32)',
          }}
        >
          <Icon name={icon} size={24} color="#FFFFFF" strokeWidth={2.2} />
        </LinearGradient>
      ) : null}
      <Text style={{ fontSize: 27, fontWeight: '700', color: colors.text, letterSpacing: -0.6, lineHeight: 32 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: colors.text2, marginTop: 9, lineHeight: 22 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** A subtle reassurance row (lock/shield + text). Only pass claims that are true. */
export function TrustLine({ icon = 'lock', children }: { icon?: IconName; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Icon name={icon} size={13} color={colors.text3} strokeWidth={2} />
      <Text style={{ fontSize: 12, color: colors.text3, textAlign: 'center' }}>{children}</Text>
    </View>
  );
}

// ── OTP input ─────────────────────────────────────────────────────────────────

/**
 * A segmented N-box code input. A single hidden field owns the real value (so paste
 * and OS one-time-code autofill work); the boxes are a read-only view of it.
 *
 * `error` triggers a shake — the parent flips it on a wrong code and clears it on
 * the next edit.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const shake = useSharedValue(0);
  useEffect(() => {
    if (error && !reduced) {
      shake.value = withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 45 }),
        withTiming(-6, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [error, reduced, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) {
      Keyboard.dismiss();
      onComplete?.(digits);
    }
  };

  // The single "current" box: the one that would receive the next digit (or the
  // last box once full). Only lit while the hidden field is focused.
  const activeIndex = focused ? (value.length >= length ? length - 1 : value.length) : -1;
  const boxBorder = (i: number): string => {
    if (error) return colors.danger;
    if (i === activeIndex) return colors.accent;
    if (i < value.length) return colors.hairStrong;
    return colors.hair;
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, shakeStyle]}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              aspectRatio: 0.82,
              maxWidth: 56,
              borderRadius: 13,
              borderWidth: 1.5,
              borderColor: boxBorder(i),
              backgroundColor: colors.card,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: !error && i === activeIndex ? accentRing(isDark) : undefined,
            }}
          >
            <Text style={{ fontSize: 23, fontWeight: '600', color: colors.text }}>
              {value[i] ?? ''}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* The real, invisible field. `oneTimeCode` / `sms-otp` let the OS offer the
          code from Mail/Messages. Overlaid so a tap anywhere focuses it. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        caretHidden
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
      />
    </Pressable>
  );
}

// ── Resend timer ────────────────────────────────────────────────────────────────

/** "Resend in 0:24" that counts down, then a tappable "Resend code". */
export function ResendRow({
  seconds,
  onResend,
  style,
}: {
  /** Remaining cooldown seconds (parent owns the countdown). */
  seconds: number;
  onResend: () => void;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  if (seconds > 0) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return (
      <Text style={[{ fontSize: 15, color: colors.text3, textAlign: 'center' }, style]}>
        Resend code in {m}:{s}
      </Text>
    );
  }
  return (
    <Press onPress={onResend}>
      <Text style={[{ fontSize: 15, fontWeight: '600', color: colors.accent, textAlign: 'center' }, style]}>
        Resend code
      </Text>
    </Press>
  );
}

// ── Dev code pill ────────────────────────────────────────────────────────────────

/**
 * Dev-only chip that surfaces the OTP on-screen (backend EXPOSE_DEV_OTP) so the
 * flow is testable before real SMS/email delivery. Renders nothing without a code;
 * screens already guard on `__DEV__` before passing one.
 */
export function DevCodePill({ code }: { code: string | null }) {
  const { colors } = useTheme();
  if (!code) return null;
  return (
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: colors.cardSunk,
          borderWidth: 1,
          borderColor: colors.hair,
        }}
      >
        <Icon name="info" size={13} color={colors.text3} />
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.text2 }}>Dev code</Text>
        <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: '600', color: colors.text, letterSpacing: 1 }}>
          {code}
        </Text>
      </View>
    </View>
  );
}

// ── Primary CTA ──────────────────────────────────────────────────────────────────

/** Gradient primary button for the verify flow (matches the redesign's CTA). */
export function VerifyButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => ({ opacity: off ? 0.5 : pressed ? 0.92 : 1 })}
    >
      <LinearGradient
        colors={[colors.accent, colors.brandYellowDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          height: 54,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: off ? undefined : '0px 10px 24px rgba(24,119,242,0.32)',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ fontSize: 16.5, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.1 }}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ── Verified badge ──────────────────────────────────────────────────────────────

/**
 * The small "verified" check shown next to a name (profile, application cards).
 * A filled accent disc with a white tick — reads at a glance even at 14px.
 */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Verified"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="check" size={size * 0.64} color="#fff" strokeWidth={3} />
    </View>
  );
}
