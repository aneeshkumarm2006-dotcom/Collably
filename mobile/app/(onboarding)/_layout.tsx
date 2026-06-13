/**
 * Onboarding stack (PRD §4.1, §7.2). Headerless stack reached when a user is
 * authenticated but `isOnboarded === false` — the root gate routes business →
 * `business`, creator → `creator`. Single screen per role with internal step
 * state and a progress stepper; no tabs and no exit until complete.
 *
 * Phase 11 builds the real multi-step flows; Phase 9 ships navigable placeholders.
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="business" />
      <Stack.Screen name="creator" />
    </Stack>
  );
}
