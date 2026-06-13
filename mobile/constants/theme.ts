/**
 * Design tokens for Collably, ported from the design reference
 * `_ai_context/Food Collaboration App/app/tokens.jsx` (CollabSpace theme).
 *
 * Brand: Blinkit-green `#0C831F` primary accent, green reserved for money/rewards,
 * cool blue-gray "paper" backgrounds, coral/danger reds. Two palettes (light/dark)
 * plus shared radii / spacing / type scales. Consumed two ways:
 *   1. At runtime via the `useTheme()` hook (`components/ThemeProvider.tsx`) for
 *      values that must react to color scheme (colors, shadows).
 *   2. At build time by Tailwind/NativeWind (`tailwind.config.js` imports this file)
 *      so `className="bg-card text-money"` resolves to the same hex values.
 *
 * Keep this file framework-agnostic (no React Native imports) so both the Tailwind
 * config (Node) and the app (Metro) can require it.
 */

export type ThemeColors = {
  dark: boolean;
  bg: string;
  bgElev: string;
  card: string;
  cardSunk: string;
  text: string;
  text2: string;
  text3: string;
  hair: string;
  hairStrong: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  money: string;
  moneySoft: string;
  success: string;
  successSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  brandYellow: string;
  brandYellowDeep: string;
  brandInk: string;
  brandInk2: string;
  brandGreen: string;
  brandGreenDeep: string;
  brandGreenText: string;
  brandGreenSoft: string;
  tabBar: string;
  navBar: string;
  sheet: string;
  scrim: string;
  skeleton: string;
  skeleton2: string;
};

export const LIGHT: ThemeColors = {
  dark: false,
  bg: '#E9ECF3', // grouped background (brand "paper", cool gray)
  bgElev: '#F3F5F9',
  card: '#FFFFFF',
  cardSunk: '#F1F3F8',
  text: '#131A2E', // ink
  text2: '#5A6480', // muted
  text3: '#9098AC',
  hair: '#DEE2EC',
  hairStrong: '#CDD3E0',
  accent: '#0C831F', // Blinkit green — primary actions
  accentSoft: '#E3F3E7',
  accentText: '#FFFFFF',
  money: '#0C831F', // rewards / $ values — green (savings)
  moneySoft: '#E3F3E7',
  success: '#1C8A56',
  successSoft: '#E2F2EA',
  warn: '#C77A12',
  warnSoft: '#FBEFD9',
  danger: '#D2382C',
  brandYellow: '#F8CB46',
  brandYellowDeep: '#F1BE26',
  brandInk: '#1A1B10',
  brandInk2: 'rgba(26,27,16,0.62)',
  brandGreen: '#0C831F',
  brandGreenDeep: '#0A6E1A',
  brandGreenText: '#0C831F',
  brandGreenSoft: '#E3F3E7',
  tabBar: 'rgba(247,249,252,0.82)',
  navBar: 'rgba(233,236,243,0.8)',
  sheet: '#F3F5F9',
  scrim: 'rgba(19,26,46,0.42)',
  skeleton: '#E2E6EF',
  skeleton2: '#EDEFF5',
};

export const DARK: ThemeColors = {
  dark: true,
  bg: '#080B12',
  bgElev: '#12161F',
  card: '#161A24',
  cardSunk: '#0E121A',
  text: '#F2F4F8',
  text2: '#9AA3B8',
  text3: '#646D82',
  hair: '#262C39',
  hairStrong: '#323A4A',
  accent: '#1FA23C',
  accentSoft: 'rgba(31,162,60,0.16)',
  accentText: '#FFFFFF',
  money: '#43C463',
  moneySoft: 'rgba(31,162,60,0.16)',
  success: '#3DD08A',
  successSoft: '#11271D',
  warn: '#E7A53C',
  warnSoft: '#2E2310',
  danger: '#FF6257',
  brandYellow: '#F8CB46',
  brandYellowDeep: '#EBB827',
  brandInk: '#1A1B10',
  brandInk2: 'rgba(26,27,16,0.64)',
  brandGreen: '#1FA23C',
  brandGreenDeep: '#18852F',
  brandGreenText: '#43C463',
  brandGreenSoft: 'rgba(31,162,60,0.16)',
  tabBar: 'rgba(18,22,31,0.72)',
  navBar: 'rgba(8,11,18,0.72)',
  sheet: '#1A1F2B',
  scrim: 'rgba(0,0,0,0.55)',
  skeleton: '#1E2430',
  skeleton2: '#262D3B',
};

/** Native drop-shadow presets (RN style objects, not CSS strings). */
export const SHADOWS = {
  card: {
    shadowColor: '#131A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  cardStrong: {
    shadowColor: '#131A2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 6,
  },
} as const;

/** Corner radii. Cards use `lg`, pills/chips use `full`. */
export const RADII = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

/** 4-pt spacing scale (matches the design reference's rhythm). */
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Type scale (size / lineHeight in px). */
export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;

/** Category → cover gradient fallback (used when a campaign photo fails to load). */
export const COVER_GRADIENTS: Record<string, [string, string]> = {
  dining: ['#2A3358', '#46507F'],
  beauty: ['#7A3B5E', '#B05D80'],
  cafe: ['#5A4732', '#8A6A45'],
  fitness: ['#1F5E58', '#2E8077'],
  fashion: ['#3A3A66', '#5C5C9A'],
  drinks: ['#5A2F44', '#8A4A6A'],
  travel: ['#2A4A6E', '#3F6E9A'],
  wellness: ['#3E5F4E', '#5E8A72'],
};

export type ThemeName = 'light' | 'dark';

export const THEMES: Record<ThemeName, ThemeColors> = { light: LIGHT, dark: DARK };
