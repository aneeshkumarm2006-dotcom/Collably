/**
 * Tailwind / NativeWind v4 config.
 *
 * The palette and scales are imported from the same design tokens the runtime
 * theme uses (`constants/theme.ts`) so a utility class like `bg-card` or
 * `text-money` resolves to the exact hex the `useTheme()` hook serves — one
 * source of truth, no drift. This file is `.ts` (not `.js`) on purpose: Tailwind
 * loads it via jiti, which transpiles both this config and the `theme.ts` import.
 *
 * Light values are the defaults. Dark mode is driven by NativeWind's color-scheme
 * handling; the runtime `useTheme()` hook supplies fully-resolved dark colors for
 * dynamic styles, while these utilities cover the static cases.
 */
import type { Config } from 'tailwindcss';
import { LIGHT, DARK, RADII, SPACING, FONT_SIZES } from './constants/theme';

const config: Config = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: LIGHT.bg,
        'bg-elev': LIGHT.bgElev,
        card: LIGHT.card,
        'card-sunk': LIGHT.cardSunk,
        ink: LIGHT.text,
        muted: LIGHT.text2,
        faint: LIGHT.text3,
        hair: LIGHT.hair,
        'hair-strong': LIGHT.hairStrong,
        accent: LIGHT.accent,
        'accent-soft': LIGHT.accentSoft,
        'accent-text': LIGHT.accentText,
        money: LIGHT.money,
        'money-soft': LIGHT.moneySoft,
        success: LIGHT.success,
        'success-soft': LIGHT.successSoft,
        warn: LIGHT.warn,
        'warn-soft': LIGHT.warnSoft,
        danger: LIGHT.danger,
        'brand-yellow': LIGHT.brandYellow,
        'brand-green': LIGHT.brandGreen,
        'dark-bg': DARK.bg,
        'dark-card': DARK.card,
        'dark-ink': DARK.text,
      },
      borderRadius: {
        xs: `${RADII.xs}px`,
        sm: `${RADII.sm}px`,
        md: `${RADII.md}px`,
        lg: `${RADII.lg}px`,
        xl: `${RADII.xl}px`,
        '2xl': `${RADII['2xl']}px`,
        full: `${RADII.full}px`,
      },
      spacing: Object.fromEntries(Object.entries(SPACING).map(([k, v]) => [k, `${v}px`])),
      fontSize: Object.fromEntries(Object.entries(FONT_SIZES).map(([k, v]) => [k, `${v}px`])),
    },
  },
  plugins: [],
};

export default config;
