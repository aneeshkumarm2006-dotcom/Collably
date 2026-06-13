/**
 * Admin navigator root (PRD §4.1, §7.5). Headerless stack whose first screen is
 * the bottom-tab group `(tabs)`; the `businesses` and `creators` moderation
 * screens are pushed siblings reached from the dashboard's Manage list. Reached
 * when an admin account is authenticated.
 */
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="businesses" />
      <Stack.Screen name="creators" />
    </Stack>
  );
}
