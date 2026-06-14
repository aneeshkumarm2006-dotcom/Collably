/**
 * Auth stack (PRD §4.1, §7.1). Headerless stack for the pre-login surface —
 * welcome, login, signup, and the password-reset flow. Reachable when the session
 * is `unauthenticated`, and also while in `guest` mode so a browsing guest can hit
 * "Login to Apply" (the root gate in `app/_layout.tsx` enforces who lands here).
 *
 * Phase 10 fills in the real screens; Phase 9 ships navigable placeholders.
 */
import { Stack } from 'expo-router';
import { useTheme } from '@/components/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    // The yellow `contentStyle` matches the auth hero, so entering login/signup
    // never flashes a white frame under the slide. The Sign up ⇄ Sign in toggle is
    // now in-place (PremiumAuthLayout owns it) — no route change, no crossfade.
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.brandYellow } }}>
      <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: colors.bg } }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" options={{ contentStyle: { backgroundColor: colors.bg } }} />
      <Stack.Screen name="reset-password" options={{ contentStyle: { backgroundColor: colors.bg } }} />
    </Stack>
  );
}
