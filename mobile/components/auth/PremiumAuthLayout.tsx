/**
 * Premium auth layout (PRD §7.1) — the redesigned login/signup chrome in the
 * "blue-black cinematic" design system shared with the story onboarding flow. The
 * whole screen sits on a dark blue-black gradient ground (NOT a light card sheet):
 * a circular translucent back control, an optional role chip, the BrandMark in
 * white ink, and a role-aware headline, then the form (LoginForm or SignupForm)
 * over the same dark ground, with a Sign up / Sign in switch at the bottom.
 *
 * The Sign up ⇄ Sign in toggle switches the form IN PLACE via state — it does NOT
 * navigate between routes. That kills the white-flash hard-cut you'd get from
 * remounting a screen, and lets the picked role survive the round trip (toggling to
 * Sign in and back to Sign up keeps Creator/Business selected).
 *
 * The form building blocks (AuthInput, Button, Google/Apple buttons, footer) are
 * shared with light-background screens, so they're made legible on the dark ground
 * two ways, without changing their props: `DarkSurfaceProvider` opts them into a
 * light-on-dark, translucent "glass" treatment, and a forced DARK theme context
 * keeps any inline theme-driven bits (e.g. the signup role picker, the "Forgot
 * password?" link) legible too. Neither touches the forms' logic.
 */
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext, DARK_THEME } from '@/components/ThemeProvider';
import { Icon, DarkSurfaceProvider } from '@/components/ui';
import { BrandMark } from '@/components/shared';
import { SignupForm, type SignupRole } from './SignupForm';
import { LoginForm } from './LoginForm';

// ── blue-black cinematic palette (matches the story onboarding) ──────────────
const GROUND = ['#16233F', '#0B0C11'] as const; // top → bottom dark ground
const INK = '#FFFFFF';
const INK_SOFT = 'rgba(255,255,255,0.78)';
const INK_MUTED = 'rgba(255,255,255,0.6)';
const ACCENT = '#5AA0FF'; // light blue link/text
const CHIP_FILL = 'rgba(255,255,255,0.16)';
const CHIP_BORDER = 'rgba(255,255,255,0.22)';
const ROLE_FILL = 'rgba(45,136,255,0.16)';
const ROLE_BORDER = 'rgba(90,160,255,0.4)';
const ROLE_TEXT = '#9CC4FF';

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
  if (role === 'business') return 'Find creators who fit\nyour brand, fast.';
  return 'Create your\nLocal Creator Crew account.';
}

function subtitleFor(mode: PremiumAuthMode, role: PremiumAuthRole): string {
  if (mode === 'signin') return 'Sign in to pick up where you left off.';
  if (role === 'creator') return 'Join free and start applying to local collabs.';
  if (role === 'business') return 'Post a gifting campaign and meet local creators.';
  return 'One quick step and you’re in.';
}

export function PremiumAuthLayout({ initialMode, initialRole = null, onBack }: PremiumAuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PremiumAuthMode>(initialMode);
  // A role picked in the inline picker overrides the (possibly late) param.
  const [pickedRole, setPickedRole] = useState<SignupRole | null>(null);
  const role: PremiumAuthRole = pickedRole ?? initialRole;
  const android = Platform.OS === 'android';

  // The dark cinematic ground needs LIGHT status-bar icons; restore the theme
  // default (driven by the OS scheme) on exit.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle('auto', true);
    }, []),
  );

  // The role chip + role-aware headline only make sense while signing up.
  const showRole = mode === 'signup' && role;

  // Back must be safe even when this screen is the root — a returning user who logged
  // out lands directly on /login (via replace), so there's no history to pop. Falling
  // back to Welcome dispatches no unhandleable GO_BACK and lands somewhere sensible.
  const handleBack = onBack ?? (() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/welcome');
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: GROUND[1] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Blue-black cinematic ground (static gradient behind everything) ── */}
      <LinearGradient colors={GROUND} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header: back + role chip, brand lockup, role-aware headline ── */}
          <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: CHIP_FILL,
                  borderWidth: 1,
                  borderColor: CHIP_BORDER,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Icon name={android ? 'arrowL' : 'chevL'} size={android ? 20 : 19} color={INK} strokeWidth={2.2} />
              </Pressable>

              {showRole ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: ROLE_FILL,
                    borderWidth: 1,
                    borderColor: ROLE_BORDER,
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    paddingVertical: 7,
                  }}
                >
                  <Icon name={role === 'creator' ? 'person' : 'store'} size={14} color={ROLE_TEXT} strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: ROLE_TEXT }}>{role === 'creator' ? 'Creator' : 'Business'}</Text>
                </View>
              ) : null}
            </View>

            {/* brand lockup — the connector mark in white ink on the dark ground */}
            <View style={{ marginTop: 26 }}>
              <BrandMark size={40} wordmark color={INK} wordmarkColor={INK} bg={GROUND[0]} />
            </View>

            {/* headline + subtitle */}
            <Text style={{ fontSize: 27, fontWeight: '900', color: INK, letterSpacing: -0.8, lineHeight: 32, marginTop: 20 }}>
              {headlineFor(mode, role)}
            </Text>
            <Text style={{ fontSize: 15, color: INK_SOFT, marginTop: 9, lineHeight: 21 }}>
              {subtitleFor(mode, role)}
            </Text>
          </View>

          {/* ── Form over the same dark ground ──
              Both providers keep the shared form building blocks legible on dark:
              DarkSurface → translucent "glass" styling; forced DARK theme → any
              inline theme-driven text/links. Neither changes the forms' logic. */}
          <ThemeContext.Provider value={DARK_THEME}>
            <DarkSurfaceProvider>
              <View style={{ paddingHorizontal: 24, paddingTop: 26 }}>
                {/* One form at a time. Sign in is the default; sign up isn't shown until
                    the user taps the switch link below — so a returning user sees only
                    sign in. */}
                {mode === 'signup' ? (
                  <SignupForm role={role} onPickRole={setPickedRole} />
                ) : (
                  <LoginForm onNeedSignup={() => setMode('signup')} />
                )}

                {/* Bottom switch: "New to Local Creator Crew? Sign up" ⇄ "Already have an account? Sign in" */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 }}>
                  <Text style={{ fontSize: 14, color: INK_MUTED }}>
                    {mode === 'signin' ? 'New to Local Creator Crew?' : 'Already have an account?'}
                  </Text>
                  <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} hitSlop={10}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: ACCENT }}>
                      {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </DarkSurfaceProvider>
          </ThemeContext.Provider>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
