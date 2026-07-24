/**
 * Root layout + auth gate (Phase 9).
 *
 * App-wide providers and one-time boot work, plus the routing brain that sends
 * each user to the right navigator based on auth state + role:
 *   - imports `global.css` so NativeWind utilities are available everywhere;
 *   - GestureHandler + SafeArea + BottomSheetModal providers screens rely on;
 *   - our `ThemeProvider` (light/dark palette from the design tokens);
 *   - loads fonts (empty map today — custom faces drop in here later) and hydrates
 *     the auth session from SecureStore, keeping the native splash up until both
 *     finish so the first frame is never a flash of the wrong screen;
 *   - `useAuthGate()` watches the session and `replace()`s into the correct route
 *     group; `usePushNotifications()` registers the Expo push token once logged in
 *     and routes notification taps to their `deepLinkPath` (Phase 15).
 *
 * Route groups: (auth) · (onboarding) · (creator) · (business) · (admin).
 */
import '../global.css';

import { useEffect, useState } from 'react';
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
  type Href,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/components/ThemeProvider';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { ToastHost } from '@/components/ui';
import { CelebrationModal } from '@/components/shared/CelebrationModal';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { REQUIRE_PHONE_VERIFICATION } from '@/lib/env';
import { configureNotificationHandler } from '@/lib/notifications';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { useChatSocket } from '@/lib/useChatSocket';
import { useNotificationSocket } from '@/lib/useNotificationSocket';

// Keep the native splash visible until fonts + session are ready.
void SplashScreen.preventAutoHideAsync();

// Foreground notification presentation — safe to call once at module load.
configureNotificationHandler();

/**
 * Expo Router picks up an `ErrorBoundary` export from any route file and wraps
 * that route in it. Exporting it from the ROOT layout makes it the app-wide net:
 * a render throw anywhere in the tree shows the themed fallback with a retry
 * instead of a blank screen in release. Implementation lives in
 * `components/RootErrorBoundary` (provider-free by design — see its header).
 */
export { RootErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  // Empty map: no custom faces yet, but this wires the loading gate so adding
  // brand fonts later is a one-line change with no splash/flash regressions.
  const [fontsLoaded] = useFonts({});
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  // Restore the session + theme preference from storage exactly once on boot.
  useEffect(() => {
    void hydrate();
    void hydrateTheme();
  }, [hydrate, hydrateTheme]);

  // Minimum time the branded Local Creator Crew intro (app/index.tsx) stays visible before
  // the auth gate routes away — otherwise it flashes for ~1 frame.
  //
  // Sized to the intro animation itself (mark draw-on + wordmark), not padded past
  // it: this used to be a flat 1500ms of *static* splash, which was ~550ms of dead
  // waiting the user got nothing for. Now the wait is shorter AND it's the animation.
  const SPLASH_MIN_MS = __DEV__ ? 500 : 950;
  const [minElapsed, setMinElapsed] = useState(false);

  // Hide the native splash once fonts are ready AND auth has resolved — this
  // reveals the JS BootScreen. The minimum-display countdown starts HERE (not at
  // mount) so the splash is guaranteed to show for SPLASH_MIN_MS even when the
  // dev bundle load itself takes several seconds.
  const booted = fontsLoaded && status !== 'loading';
  useEffect(() => {
    if (!booted) return;
    void SplashScreen.hideAsync();
    const id = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(id);
  }, [booted]);

  // Only let the gate redirect once boot is done AND the splash has shown long
  // enough, so the CollabSpace intro is actually visible.
  const ready = booted && minElapsed;
  useAuthGate(ready);
  usePushNotifications(ready);
  useChatSocket(ready);
  useNotificationSocket(ready);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(creator)" />
              <Stack.Screen name="(business)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="verify" />

            </Stack>
            {/* App-wide overlay: network-error toasts (raised from anywhere via lib/toast). */}
            <ToastHost />
            {/* App-wide overlay: the "Hurray" confetti popup on approval/verify. */}
            <CelebrationModal />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Top-level route group a user belongs in, plus where to land inside it. */
type RouteTarget = { group: string; href: Href };

/**
 * Map the current session to its destination group + landing screen.
 * `null` means "stay put" (still loading — the gate waits).
 */
function resolveTarget(
  status: ReturnType<typeof useAuthStore.getState>['status'],
  role: ReturnType<typeof useAuthStore.getState>['role'],
  isOnboarded: boolean,
  hasAuthedBefore: boolean,
  needsVerification: boolean,
): RouteTarget | null {
  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    // A returning user who logged out lands on Sign in; a brand-new device gets the
    // Welcome role-picker. Both live in (auth), so the gate's group check is unaffected.
    return {
      group: '(auth)',
      href: (hasAuthedBefore ? '/(auth)/login' : '/(auth)/welcome') as Href,
    };
  }

  if (status === 'guest') {
    // PRD §8.6 — guests browse the creator Explore tab read-only.
    return { group: '(creator)', href: '/(creator)/(tabs)/explore' as Href };
  }

  // Email + phone are a mandatory gate for creators/businesses — no access to
  // onboarding or the app until both are verified. Admins are exempt.
  if (needsVerification && (role === 'creator' || role === 'business')) {
    return { group: 'verify', href: '/verify/required' as Href };
  }

  // authenticated — onboarding gates creator/business until their profile exists.
  if (!isOnboarded && (role === 'creator' || role === 'business')) {
    return {
      group: '(onboarding)',
      href: (role === 'business' ? '/(onboarding)/business' : '/(onboarding)/creator') as Href,
    };
  }

  switch (role) {
    case 'business':
      return { group: '(business)', href: '/(business)/(tabs)/home' as Href };
    case 'admin':
      return { group: '(admin)', href: '/(admin)/(tabs)/dashboard' as Href };
    case 'creator':
    default:
      return { group: '(creator)', href: '/(creator)/(tabs)/home' as Href };
  }
}

/**
 * Redirect the user into the route group their session allows. Runs whenever the
 * session or the current route changes. Guests are also allowed inside `(auth)`
 * so a "Login to Apply" prompt can push the login screen without bouncing back.
 */
function useAuthGate(booted: boolean): void {
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const isOnboarded = useAuthStore((s) => s.user?.isOnboarded ?? false);
  const hasAuthedBefore = useAuthStore((s) => s.hasAuthedBefore);
  const emailVerified = useAuthStore((s) => s.user?.isVerified ?? false);
  const isPhoneVerified = useAuthStore((s) => s.user?.isPhoneVerified ?? false);
  // Phone only gates entry when the build opts in; email-only builds treat it as
  // satisfied. Keep this in lockstep with the same flag in app/verify/required.tsx.
  const phoneVerified = REQUIRE_PHONE_VERIFICATION ? isPhoneVerified : true;
  // Dev-only escape hatch: skip the mandatory email/phone gate while testing the
  // rest of the app before SMS/email delivery is fully wired. HARD-gated on
  // `__DEV__`, so a production build ALWAYS enforces verification no matter what
  // the env flag says. Flip EXPO_PUBLIC_SKIP_VERIFY back to false (and restart the
  // bundler) to test the verification flow itself again.
  const skipVerify = __DEV__ && process.env.EXPO_PUBLIC_SKIP_VERIFY === 'true';
  const needsVerification = !skipVerify && (!emailVerified || !phoneVerified);

  useEffect(() => {
    // Wait until boot is done and the navigator has mounted (else replace throws).
    if (!booted || !navState?.key) return;

    const target = resolveTarget(status, role, isOnboarded, hasAuthedBefore, needsVerification);
    if (!target) return;

    const currentGroup = segments[0];
    if (currentGroup === target.group) return;

    // A guest mid-login may legitimately sit in (auth) — don't yank them out.
    if (status === 'guest' && currentGroup === '(auth)') return;

    router.replace(target.href);
  }, [booted, navState?.key, status, role, isOnboarded, hasAuthedBefore, needsVerification, segments, router]);
}
