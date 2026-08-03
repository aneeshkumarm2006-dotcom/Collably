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
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
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
  // NativeWind tracks the active scheme and drives `dark:` variants; the user's
  // saved preference (system/light/dark) forces it via setColorScheme.
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    setColorScheme(mode); // 'system' | 'light' | 'dark' — all accepted by NativeWind
  }, [mode, setColorScheme]);

  const isDark = colorScheme === 'dark';

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
