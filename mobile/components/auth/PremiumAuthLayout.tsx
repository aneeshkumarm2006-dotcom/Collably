/**
 * Premium auth layout (PRD §7.1) — the redesigned login/signup chrome from the
 * "CollabSpace Mobile" design: a yellow brand hero (role-aware headline, role chip,
 * back control) with a card sheet overlapping the seam, a Sign up / Sign in
 * segmented toggle, and a shared footer (social + security + terms).
 *
 * The Sign up ⇄ Sign in toggle switches the form IN PLACE via state — it does NOT
 * navigate between routes. That kills the white-flash hard-cut you'd get from
 * remounting a screen, and lets the picked role survive the round trip (toggling to
 * Sign in and back to Sign up keeps Creator/Business selected).
 *
 * Cross-platform: the back control uses an Android arrow vs. an iOS chevron+label,
 * and the yellow hero forces dark status-bar icons on both.
 */
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from '@/components/ui';
import { BrandMark } from '@/components/shared';
import { SignupForm, type SignupRole } from './SignupForm';
import { LoginForm } from './LoginForm';

const INK = '#FFFFFF';
const INK_SOFT = 'rgba(255,255,255,0.66)';
const INK_CHIP = 'rgba(255,255,255,0.18)';

export type PremiumAuthRole = SignupRole | null;
export type PremiumAuthMode = 'signup' | 'signin';

export type PremiumAuthLayoutProps = {
  /** Which form is shown first (entry route decides). */
  initialMode: PremiumAuthMode;
  /** Role pre-selected from the welcome tiles (signup only); read every render so a
   *  late-hydrating `?role=` param still lands. */
  initialRole?: PremiumAuthRole;
  onBack?: () => void;
};

function headlineFor(mode: PremiumAuthMode, role: PremiumAuthRole): string {
  if (mode === 'signin') return 'Welcome back.\nLet’s get to it.';
  if (role === 'creator') return 'Get paid in perks for\ncontent you already make.';
  if (role === 'business') return 'Find creators who fit\nyour brand — fast.';
  return 'Create your\nCollabSpace account.';
}

export function PremiumAuthLayout({ initialMode, initialRole = null, onBack }: PremiumAuthLayoutProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PremiumAuthMode>(initialMode);
  // A role picked in the inline picker overrides the (possibly late) param.
  const [pickedRole, setPickedRole] = useState<SignupRole | null>(null);
  const role: PremiumAuthRole = pickedRole ?? initialRole;
  const android = Platform.OS === 'android';

  // The yellow hero needs dark status-bar icons; restore the theme default on exit.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark', true);
      return () => setStatusBarStyle(isDark ? 'light' : 'dark', true);
    }, [isDark]),
  );

  // The role chip + role-aware headline only make sense while signing up.
  const showRole = mode === 'signup' && role;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.brandYellow }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Yellow brand hero ── */}
      <LinearGradient
        colors={[colors.brandYellow, colors.brandYellowDeep]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 60,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0.88, y: 0 }}
          end={{ x: 0.45, y: 0.65 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
          pointerEvents="none"
        />

        {/* back + role chip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: INK_CHIP,
              borderRadius: 20,
              paddingVertical: 8,
              paddingLeft: 9,
              paddingRight: android ? 9 : 14,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name={android ? 'arrowL' : 'chevL'} size={android ? 21 : 19} color={INK} strokeWidth={2.4} />
            {!android && <Text style={{ fontSize: 14.5, fontWeight: '700', color: INK }}>Back</Text>}
          </Pressable>

          {showRole ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: INK_CHIP, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Icon name={role === 'creator' ? 'person' : 'store'} size={14} color={INK} strokeWidth={2.2} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: INK }}>{role === 'creator' ? 'Creator' : 'Business'}</Text>
            </View>
          ) : null}
        </View>

        {/* brand lockup — the design's connector mark, ink on yellow */}
        <View style={{ marginTop: 24 }}>
          <BrandMark size={44} wordmark color={INK} wordmarkColor={INK} bg={colors.brandYellow} />
        </View>

        {/* headline */}
        <Text style={{ fontSize: 24, fontWeight: '800', color: INK, letterSpacing: -0.6, lineHeight: 28, marginTop: 16 }}>
          {headlineFor(mode, role)}
        </Text>
      </LinearGradient>

      {/* ── Card sheet overlapping the seam ── */}
      <ScrollView
        style={{ flex: 1, marginTop: -40 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexGrow: 1,
            backgroundColor: colors.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* One form at a time. Sign in is the default; sign up isn't shown until the
              user taps the switch link below — so a returning user sees only sign in. */}
          {mode === 'signup' ? (
            <SignupForm role={role} onPickRole={setPickedRole} />
          ) : (
            <LoginForm />
          )}

          {/* Bottom switch: "New to LocalShout? Sign up" ⇄ "Already have an account? Sign in" */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 }}>
            <Text style={{ fontSize: 14, color: colors.text2 }}>
              {mode === 'signin' ? 'New to LocalShout?' : 'Already have an account?'}
            </Text>
            <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} hitSlop={10}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accent }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export { INK as AUTH_INK, INK_SOFT as AUTH_INK_SOFT };
