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
import { Platform, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext, DARK_THEME, useTheme } from '@/components/ThemeProvider';
import { Icon, DarkSurfaceProvider, KeyboardAwareScrollView } from '@/components/ui';
import { BrandMark } from '@/components/shared';
import { SignupForm, type SignupRole } from './SignupForm';
import { LoginForm } from './LoginForm';

// ── cinematic palette, matched to the story onboarding in BOTH themes ────────
// Dark keeps the original blue-black ground. Light is a cool near-white with the
// same blue bias, so the two flows still read as one system rather than as a
// cinematic dark screen bolted onto a plain white form.
const GROUND_DARK = ['#16233F', '#0B0C11'] as const;
// Kept in step with the story onboarding's light ground so the two flows still read
// as one system. Tinted rather than flat white — elevated chrome needs something to
// lift off, and a pure-white ground makes the whole screen read as an unstyled form.
const GROUND_LIGHT = ['#E7EFFE', '#FBFCFF'] as const;
const ROLE_FILL = 'rgba(45,136,255,0.16)';
const ROLE_BORDER = 'rgba(90,160,255,0.4)';

/** Ink + chrome for the current theme. Mirrors `storyTheme`'s ink/glass split. */
function authPalette(isDark: boolean) {
  const rgb = isDark ? '255,255,255' : '11,21,36';
  return {
    ground: isDark ? GROUND_DARK : GROUND_LIGHT,
    ink: `rgba(${rgb},1)`,
    inkSoft: `rgba(${rgb},0.78)`,
    inkMuted: `rgba(${rgb},0.6)`,
    // Dark lifts with translucency; light lifts with a solid surface + shadow.
    chipFill: isDark ? `rgba(${rgb},0.16)` : '#FFFFFF',
    chipBorder: isDark ? `rgba(${rgb},0.22)` : '#E2E9F6',
    chipElevation: isDark
      ? {}
      : { shadowColor: '#0F2B5B', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    // The pale blue link reads on near-black but vanishes on near-white.
    accent: isDark ? '#5AA0FF' : '#1B62C9',
    roleText: isDark ? '#9CC4FF' : '#1B62C9',
  };
}

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
  // Follow the system theme. This screen used to force DARK_THEME on its whole
  // subtree; now the forced context and DarkSurfaceProvider are mounted only when
  // the theme is actually dark, which lets the shared form parts (AuthInput,
  // Button, the Google/Apple buttons) fall back to the light styling they already
  // shipped with. No component needed new props.
  const { isDark } = useTheme();
  const pal = authPalette(isDark);
  const GROUND = pal.ground;
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PremiumAuthMode>(initialMode);
  // A role picked in the inline picker overrides the (possibly late) param.
  const [pickedRole, setPickedRole] = useState<SignupRole | null>(null);
  const role: PremiumAuthRole = pickedRole ?? initialRole;
  const android = Platform.OS === 'android';

  // Status-bar icons must contrast with the ground we actually painted, so this
  // follows the theme rather than always asking for light icons.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark', true);
      return () => setStatusBarStyle('auto', true);
    }, [isDark]),
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
    // Keyboard handling lives in `KeyboardAwareScrollView`, NOT a KeyboardAvoidingView.
    //
    // This used to be `<KeyboardAvoidingView behavior="padding">` wrapping a ScrollView
    // whose content had `flexGrow: 1`, and the two fought every frame: the KAV padded
    // the bottom by the keyboard height → the scroll viewport shrank → `flexGrow: 1`
    // re-measured the content to the new viewport → the size change made the KAV
    // re-measure and re-pad → repeat. On iOS that never settles, so the whole form
    // (and most visibly the focused field's blue ring) strobed while you typed.
    //
    // The scroll-into-view behaviour is not lost — it's better. The KAV only ever added
    // padding; it never scrolled the focused field anywhere. `automaticallyAdjustKeyboardInsets`
    // insets the content AND has UIKit bring the first responder into view, and because
    // it moves the *content inset* rather than the view's frame, `flexGrow: 1` never
    // re-measures. No loop, and the user still never scrolls by hand.
    <View style={{ flex: 1, backgroundColor: GROUND[1] }}>
      {/* ── Blue-black cinematic ground (static gradient behind everything) ── */}
      <LinearGradient colors={GROUND} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 28 }}
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
                  backgroundColor: pal.chipFill,
                  borderWidth: 1,
                  borderColor: pal.chipBorder,
                  opacity: pressed ? 0.6 : 1,
                  ...pal.chipElevation,
                })}
              >
                <Icon name={android ? 'arrowL' : 'chevL'} size={android ? 20 : 19} color={pal.ink} strokeWidth={2.2} />
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
                  <Icon name={role === 'creator' ? 'person' : 'store'} size={14} color={pal.roleText} strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: pal.roleText }}>{role === 'creator' ? 'Creator' : 'Business'}</Text>
                </View>
              ) : null}
            </View>

            {/* brand lockup — the connector mark in white ink on the dark ground */}
            <View style={{ marginTop: 26 }}>
              <BrandMark size={40} wordmark color={pal.ink} wordmarkColor={pal.ink} bg={GROUND[0]} />
            </View>

            {/* headline + subtitle */}
            <Text style={{ fontSize: 27, fontWeight: '900', color: pal.ink, letterSpacing: -0.8, lineHeight: 32, marginTop: 20 }}>
              {headlineFor(mode, role)}
            </Text>
            <Text style={{ fontSize: 15, color: pal.inkSoft, marginTop: 9, lineHeight: 21 }}>
              {subtitleFor(mode, role)}
            </Text>
          </View>

          {/* ── Form over the same dark ground ──
              Both providers keep the shared form building blocks legible on dark:
              DarkSurface → translucent "glass" styling; forced DARK theme → any
              inline theme-driven text/links. Neither changes the forms' logic. */}
          <ThemedFormSurface isDark={isDark}>
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
                  <Text style={{ fontSize: 14, color: pal.inkMuted }}>
                    {mode === 'signin' ? 'New to Local Creator Crew?' : 'Already have an account?'}
                  </Text>
                  <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} hitSlop={10}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: pal.accent }}>
                      {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </Text>
                  </Pressable>
                </View>
              </View>
          </ThemedFormSurface>
        </KeyboardAwareScrollView>
      </LinearGradient>
    </View>
  );
}

/**
 * Wraps the form in the dark-surface treatment ONLY when the theme is dark.
 *
 * `AuthInput`, `Button` and the social buttons all already branch on
 * `useOnDarkSurface()`; mounting the provider unconditionally is what pinned them
 * to the light-on-dark glass styling. In light mode we mount nothing and they use
 * the styling they were originally written with.
 */
function ThemedFormSurface({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  if (!isDark) return <>{children}</>;
  return (
    <ThemeContext.Provider value={DARK_THEME}>
      <DarkSurfaceProvider>{children}</DarkSurfaceProvider>
    </ThemeContext.Provider>
  );
}
