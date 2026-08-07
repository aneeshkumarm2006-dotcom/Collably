/**
 * Story-onboarding palette — TWO design systems, not one system inverted.
 *
 * This matters, and getting it wrong is what made the first light mode look cheap:
 *
 *  • DARK is a cinematic, luminous system. Depth comes from LIGHT: translucent white
 *    "glass" surfaces lift off a near-black ground because they emit. Shadows do
 *    nothing on near-black, so there are none.
 *
 *  • LIGHT is a paper-and-elevation system. Translucent BLACK on white does not read
 *    as glass, it reads as a smudge — so light mode uses SOLID surfaces with crisp
 *    hairlines and real shadows. Depth comes from the shadow, not the fill.
 *
 * The API is shaped so call sites don't have to know which system they're in:
 * `surface`, `hairline` and `elevation()` each return the right thing per theme, so
 * one JSX tree produces luminous glass in dark and elevated paper in light.
 *
 * Brand colours (the niche/content tile gradients, the blue accent) are identical in
 * both themes and are NOT part of this split — a Food tile is the same orange either
 * way, and white icons on top of it stay white. That's what `onTile` marks.
 */
import { useTheme } from '@/components/ThemeProvider';
import type { Grad } from './StoryKit';

/** Cinematic near-black ground with a blue bias. */
export const GROUND_DARK: Grad = ['#16233F', '#0B0C11'];
/**
 * Light ground: a cool tinted canvas that resolves to white at the bottom. Tinted,
 * NOT flat white — a pure white ground gives elevated cards nothing to lift off, and
 * the whole screen reads as an unstyled form.
 */
export const GROUND_LIGHT: Grad = ['#E7EFFE', '#FBFCFF'];

/** Fixed brand accents — identical in both themes. */
export const STORY_BLUE = '#2D88FF';
export const STORY_GREEN = '#45BD62';

/** Shadow presets for light mode. Cool-tinted, never neutral grey — a blue-black
 *  shadow on a blue-tinted ground reads as depth; a grey one reads as dirt. */
const SHADOW = {
  1: { shadowColor: '#0F2B5B', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  2: { shadowColor: '#0F2B5B', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  3: { shadowColor: '#0F2B5B', shadowOpacity: 0.14, shadowRadius: 34, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
} as const;

export type Elevation = keyof typeof SHADOW;

export function useStoryPalette() {
  const { colors, isDark } = useTheme();

  // Ink is white on the dark ground, and a deep blue-black on light — never pure
  // black, which reads harsh against a blue-tinted canvas.
  const rgb = isDark ? '255,255,255' : '11,21,36';

  return {
    colors,
    isDark,

    /**
     * Raw "r,g,b" behind `ink()`. Reanimated worklets can't call the helpers (they
     * run on the UI thread) but can close over a plain string, so an animated
     * `rgba(${rgb},${alpha.value})` stays theme-aware.
     */
    rgb,

    ground: isDark ? GROUND_DARK : GROUND_LIGHT,

    /** Text and icons on the ground or on a surface. */
    ink: (alpha = 1) => `rgba(${rgb},${alpha})`,

    /**
     * A raised surface: tiles, cards, the back control. Luminous glass in dark,
     * solid paper in light. Pair with `hairline` and `elevation()`.
     */
    surface: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    /** A recessed surface: inputs and wells. */
    surfaceSunk: isDark ? 'rgba(255,255,255,0.055)' : '#F4F7FD',
    /** Crisp divider/border. Light needs a real hairline; dark leans on the glass. */
    hairline: isDark ? 'rgba(255,255,255,0.12)' : '#E2E9F6',
    /** A stronger border for focus/selected states. */
    hairlineStrong: isDark ? 'rgba(255,255,255,0.28)' : '#CBD8EE',

    /**
     * Shadow for a raised element. Returns `{}` in dark on purpose: a shadow on a
     * near-black ground is invisible work, and stacking them just costs frames.
     */
    elevation: (level: Elevation = 1) => (isDark ? {} : SHADOW[level]),

    /**
     * Genuinely translucent overlay — only for things sitting ON a photo or a
     * coloured gradient, where the backdrop shows through by design. NOT for
     * surfaces on the page ground; use `surface` for those.
     */
    glass: (alpha: number) => `rgba(${rgb},${alpha})`,

    /** Painted on a coloured gradient tile — always white, both themes. */
    onTile: '#FFFFFF',

    /** Opaque card (the profile preview) and dropdown surfaces. */
    cardSurface: isDark ? '#141830' : '#FFFFFF',
    popover: isDark ? 'rgba(14,16,26,0.97)' : '#FFFFFF',

    accent: STORY_BLUE,
    success: STORY_GREEN,
    /** Accent text ON the ground. The pale blue is unreadable on a light canvas. */
    accentText: isDark ? '#9CC4FF' : '#1257B8',
    /** Soft accent fill for selected chips. */
    accentSoft: isDark ? 'rgba(45,136,255,0.16)' : '#E8F1FF',
    accentBorder: isDark ? 'rgba(90,160,255,0.7)' : '#8FBBFF',
    /**
     * Semantic states. The originals were dark-mode-only tints (#FFB4B4, #FFD08A)
     * chosen to glow on near-black; on a light ground they wash out to almost
     * nothing, which is how an inline error can end up unreadable.
     */
    danger: isDark ? '#FFB4B4' : '#C0332C',
    warn: isDark ? '#FFD08A' : '#9A5B00',

    /** Unselected chip label. */
    chipText: isDark ? '#C9CED7' : 'rgba(11,21,36,0.68)',
  };
}
