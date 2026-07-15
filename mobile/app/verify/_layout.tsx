import { Stack } from 'expo-router';

/** Verification flows (email / phone / Instagram) — shared by both roles. */
export default function VerifyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
