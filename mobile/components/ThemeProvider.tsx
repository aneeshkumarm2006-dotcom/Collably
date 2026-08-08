/**
 * Runtime theme provider. Resolves the active palette (light/dark) from the OS
 * color scheme and exposes it via `useTheme()` for dynamic styles (colors,
 * shadows, gradients) that can't be expressed as static Tailwind classes.
 *
 * It also keeps NativeWind's color scheme in sync, so `dark:` utility variants and
 * the runtime `useTheme()` colors always agree. Static styling should prefer
 * NativeWind classes (`bg-card`, `text-money`); reach for `useTheme()` only when a
 * value must be computed in JS (e.g. a gradient pair or a shadow object).
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import * as SystemUI from 'expo-system-ui';
import { LIGHT, DARK, SHADOWS, RADII, type ThemeColors, type ThemeName } from '@/constants/theme';
import { useThemeStore } from '@/store/themeStore';

export type Theme = {
  name: ThemeName;
  isDark: boolean;
  colors: ThemeColors;
  shadows: typeof SHADOWS;
  radii: typeof RADII;
};

const lightTheme: Theme = {
  name: 'light',
  isDark: false,
  colors: LIGHT,
  shadows: SHADOWS,
  radii: RADII,
};

const darkTheme: Theme = {
  name: 'dark',
  isDark: true,
  colors: DARK,
  shadows: SHADOWS,
  radii: RADII,
};

/** A ready-made dark theme value. Used to force a dark palette onto a subtree
 *  (e.g. the cinematic auth ground) without flipping the whole app's scheme, so
 *  inline theme-driven text stays legible on a dark background. */
export const DARK_THEME = darkTheme;

/** The raw theme context — exported so a subtree can override the active palette
 *  via `<ThemeContext.Provider value={DARK_THEME}>` (see `PremiumAuthLayout`). */
export const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The runtime palette resolves from RN's own `useColorScheme()` rather than
  // NativeWind's. RN reads the OS directly and updates live, which makes it the
  // right source of truth for a value the whole app renders from; NativeWind's
  // `setColorScheme` is still called below because it drives `dark:` utility
  // variants, it just no longer decides what `useTheme()` returns. Keeping the two
  // concerns separate also means a NativeWind interop regression (this codebase
  // already carries two — see `SafePressable` and `SafeTextInput`) can't silently
  // take the entire palette with it.
  const { setColorScheme } = useNativeWindColorScheme();
  const systemScheme = useRNColorScheme();
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    setColorScheme(mode); // 'system' | 'light' | 'dark' — all accepted by NativeWind
  }, [mode, setColorScheme]);

  // An explicit light/dark preference wins; 'system' follows the OS (defaulting to
  // light when the OS reports nothing, which RN does briefly during startup).
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  // Paint the native window background to match the theme.
  //
  // Android 15+ forces edge-to-edge (Expo 54), so the app draws behind the system
  // navigation bar. Anything the JS tree doesn't cover falls through to the native
  // window background — which, left unset, is the platform default grey. Behind the
  // tab bar that surfaces as a mismatched band along the bottom of the screen.
  //
  // `expo-system-ui` was already a dependency but had never been called.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(isDark ? DARK.bg : LIGHT.bg);
  }, [isDark]);

  const theme = useMemo<Theme>(
    () => ({
      name: isDark ? 'dark' : 'light',
      isDark,
      colors: isDark ? DARK : LIGHT,
      shadows: SHADOWS,
      radii: RADII,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Access the active theme (palette, shadows, radii) from any component. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
