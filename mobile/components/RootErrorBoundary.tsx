/**
 * App-wide crash fallback. Exported as `ErrorBoundary` from `app/_layout.tsx`,
 * which is the hook Expo Router (v6) gives every route file: the router wraps the
 * route in a `<Try catch={ErrorBoundary}>`, so any render throw in the layout or
 * ANY screen beneath it lands here instead of unmounting the tree to a blank
 * white screen (the release-build failure mode — in dev you'd see LogBox).
 *
 * Deliberately provider-free. When the failure happens inside `RootLayout`'s own
 * render, this fallback is mounted OUTSIDE `ThemeProvider` / `SafeAreaProvider` /
 * `GestureHandlerRootView`, so it must not call `useTheme()` or
 * `useSafeAreaInsets()` (the latter throws without its provider — a boundary that
 * crashes is worse than no boundary). It reads the OS color scheme and picks the
 * palette straight from `constants/theme`, and uses only core RN primitives:
 * no NativeWind classes, no Reanimated, no `@/components/ui`.
 *
 * No crash reporting is wired here on purpose — the app has no Sentry DSN yet.
 * The console.error below is the only sink, so a bug report can come off a device
 * log. When a reporter is added, this is the single place to call it.
 */
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';

import { DARK, LIGHT } from '@/constants/theme';

export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColorScheme() === 'dark' ? DARK : LIGHT;

  // Surface the throw in the device log even in release. Users never see it.
  console.error('[app] render crash caught by root ErrorBoundary:', error);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: `${colors.danger}1A`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        {/* Plain glyph rather than the lucide `Icon` component: this path must not
            depend on any library that could itself be the thing that threw. */}
        <Text style={{ fontSize: 34, fontWeight: '700', color: colors.danger }}>!</Text>
      </View>

      <Text
        style={{
          fontSize: 19,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.3,
          textAlign: 'center',
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontSize: 14.5,
          color: colors.text2,
          marginTop: 7,
          lineHeight: 21,
          maxWidth: 280,
          textAlign: 'center',
        }}
      >
        The app hit an unexpected error. Your account and data are safe — try again.
      </Text>

      {/* Dev-only detail. In release the message could carry internals (or user
          data pulled into an error string), so users get the generic copy above. */}
      {__DEV__ && (
        <ScrollView style={{ maxHeight: 140, marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: colors.text3, textAlign: 'center' }}>
            {error?.message ?? String(error)}
          </Text>
        </ScrollView>
      )}

      {/* `retry()` clears the boundary's error state and re-renders the route, so
          a transient failure (a bad prop from a since-refetched query) recovers
          without a cold restart. Object-form style only — NativeWind v4 drops the
          function form of Pressable's `style`. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={() => {
          void retry();
        }}
        style={{
          marginTop: 20,
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.hairStrong,
          backgroundColor: colors.card,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Try again</Text>
      </Pressable>
    </View>
  );
}
