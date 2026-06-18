/**
 * Design tokens for Collably, themed after Meta Ads / Facebook.
 *
 * Brand: Meta-blue `#1877F2` primary accent (blue gradient headers), Facebook-green
 * `#31A24C` reserved for money/rewards, cool gray `#F0F2F5` "paper" backgrounds,
 * Facebook-red `#FA383E` for danger. Two palettes (light/dark) plus shared radii /
 * spacing / type scales. Consumed two ways:
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
  bg: '#F0F2F5', // grouped background (Facebook "paper" gray)
  bgElev: '#F7F8FA',
  card: '#FFFFFF',
  cardSunk: '#EBEDF0',
  text: '#1C1E21', // ink (FB primary text)
  text2: '#65676B', // muted (FB secondary text)
  text3: '#8A8D91',
  hair: '#DADDE1', // FB divider
  hairStrong: '#CED0D4',
  accent: '#1877F2', // Meta blue — primary actions
  accentSoft: '#E7F0FF',
  accentText: '#FFFFFF',
  money: '#31A24C', // rewards / $ values — Facebook green
  moneySoft: '#E3F1E6',
  success: '#31A24C',
  successSoft: '#E3F1E6',
  warn: '#F3A608',
  warnSoft: '#FCF1DA',
  danger: '#FA383E', // Facebook red
  brandYellow: '#1877F2', // brand header gradient start (Meta blue)
  brandYellowDeep: '#0866FF', // brand header gradient end (deep Meta blue)
  brandInk: '#FFFFFF', // text on blue header
  brandInk2: 'rgba(255,255,255,0.66)',
  brandGreen: '#1877F2', // primary brand accent (Meta blue)
  brandGreenDeep: '#0A5DC9',
  brandGreenText: '#1877F2',
  brandGreenSoft: '#E7F0FF',
  tabBar: 'rgba(247,248,250,0.82)',
  navBar: 'rgba(240,242,245,0.8)',
  sheet: '#F7F8FA',
  scrim: 'rgba(8,11,18,0.42)',
  skeleton: '#E4E6EB',
  skeleton2: '#EDEFF2',
};

export const DARK: ThemeColors = {
  dark: true,
  bg: '#18191A', // Facebook dark background
  bgElev: '#242526',
  card: '#242526', // FB dark card
  cardSunk: '#18191A',
  text: '#E4E6EB', // FB dark primary text
  text2: '#B0B3B8', // FB dark secondary text
  text3: '#8A8D91',
  hair: '#3A3B3C', // FB dark divider
  hairStrong: '#4E4F50',
  accent: '#2D88FF', // Meta blue (dark)
  accentSoft: 'rgba(45,136,255,0.16)',
  accentText: '#FFFFFF',
  money: '#45BD62', // FB dark green
  moneySoft: 'rgba(69,189,98,0.16)',
  success: '#45BD62',
  successSoft: '#102A19',
  warn: '#E7A53C',
  warnSoft: '#2E2310',
  danger: '#FF5C5C',
  brandYellow: '#2D88FF', // brand header gradient start (Meta blue, dark)
  brandYellowDeep: '#1877F2', // brand header gradient end
  brandInk: '#FFFFFF',
  brandInk2: 'rgba(255,255,255,0.7)',
  brandGreen: '#2D88FF', // primary brand accent (Meta blue, dark)
  brandGreenDeep: '#1877F2',
  brandGreenText: '#5AA0FF',
  brandGreenSoft: 'rgba(45,136,255,0.16)',
  tabBar: 'rgba(36,37,38,0.72)',
  navBar: 'rgba(24,25,26,0.72)',
  sheet: '#242526',
  scrim: 'rgba(0,0,0,0.6)',
  skeleton: '#2A2B2D',
  skeleton2: '#323436',
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
