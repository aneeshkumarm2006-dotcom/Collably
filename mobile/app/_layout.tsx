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
import { ToastHost } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { configureNotificationHandler } from '@/lib/notifications';
import { usePushNotifications } from '@/lib/usePushNotifications';

// Keep the native splash visible until fonts + session are ready.
void SplashScreen.preventAutoHideAsync();

// Foreground notification presentation — safe to call once at module load.
configureNotificationHandler();

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

  // Minimum time the branded CollabSpace splash (app/index.tsx) stays visible
  // before the auth gate routes away — otherwise it flashes for ~1 frame.
  // TEMP: 5s for review; drop back to ~1500 once confirmed.
  const SPLASH_MIN_MS = 5000;
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
            </Stack>
            {/* App-wide overlay: network-error toasts (raised from anywhere via lib/toast). */}
            <ToastHost />
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
): RouteTarget | null {
  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    return { group: '(auth)', href: '/(auth)/welcome' as Href };
  }

  if (status === 'guest') {
    // PRD §8.6 — guests browse the creator Explore tab read-only.
    return { group: '(creator)', href: '/(creator)/(tabs)/explore' as Href };
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

  useEffect(() => {
    // Wait until boot is done and the navigator has mounted (else replace throws).
    if (!booted || !navState?.key) return;

    const target = resolveTarget(status, role, isOnboarded);
    if (!target) return;

    const currentGroup = segments[0];
    if (currentGroup === target.group) return;

    // A guest mid-login may legitimately sit in (auth) — don't yank them out.
    if (status === 'guest' && currentGroup === '(auth)') return;

    router.replace(target.href);
  }, [booted, navState?.key, status, role, isOnboarded, segments, router]);
}
