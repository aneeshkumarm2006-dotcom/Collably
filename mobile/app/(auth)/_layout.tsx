/**
 * Auth stack (PRD §4.1, §7.1). Headerless stack for the pre-login surface —
 * welcome, login, signup, and the password-reset flow. Reachable when the session
 * is `unauthenticated`, and also while in `guest` mode so a browsing guest can hit
 * "Login to Apply" (the root gate in `app/_layout.tsx` enforces who lands here).
 *
 * Phase 10 fills in the real screens; Phase 9 ships navigable placeholders.
 */
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
