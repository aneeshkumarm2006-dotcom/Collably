/**
 * Creator navigator root (PRD §4.1, §7.3). A headerless stack whose first screen
 * is the bottom-tab group `(tabs)`; Phase 12 adds the pushed stack screens
 * (campaign/[id], applications, notifications, settings, …) as siblings here.
 *
 * Reached when an onboarded creator is authenticated, and in `guest` mode so a
 * guest can browse Explore + campaign detail read-only (PRD §8.6). The root gate
 * in `app/_layout.tsx` decides who lands here.
 */
import { Stack } from 'expo-router';

export default function CreatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
