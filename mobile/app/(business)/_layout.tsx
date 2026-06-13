/**
 * Business navigator root (PRD §4.1, §7.4). Headerless stack whose first screen is
 * the bottom-tab group `(tabs)`; Phase 13 adds the pushed stack screens
 * (campaigns/new, campaigns/[id]/edit + applications, submissions, …) here.
 *
 * Reached when an onboarded business account is authenticated (root gate decides).
 */
import { Stack } from 'expo-router';

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
