import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Collably website theme — the "blend" (Phase 1).
 *
 * Colors are driven by CSS variables defined in `app/globals.css` so every
 * utility is theme-aware (flips under `.dark`):
 *   • shadcn/ui semantic tokens use HSL channels   → `hsl(var(--token))`
 *   • design-reference "blend" tokens use hex/rgba  → `var(--token)`
 *
 * Radii follow the APP's rounded scale (6/8/12/16/22/28), NOT the reference's
 * tight 2–12px editorial scale. Shadows are neutral ink (no colored glow).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- shadcn/ui semantic tokens (HSL channels; support opacity modifiers) ---
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // shadcn `muted` lives under `muted_` so the app's text-muted `muted` wins below.
        muted_: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // --- App palette aliases (blend tokens; theme-aware via var()) ---
        ink: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        faint: 'var(--text-muted)',
        page: 'var(--surface-base)',
        elev: 'var(--surface-elev)',
        hair: 'hsl(var(--border))',
        'hair-strong': 'var(--border-strong)',
        brand: {
          DEFAULT: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          soft: 'var(--brand-soft)',
        },
        money: { DEFAULT: 'var(--money)', soft: 'var(--money-soft)' },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-bg)' },
        warn: { DEFAULT: 'var(--warning)', soft: 'var(--warning-bg)' },
        danger: { DEFAULT: 'var(--error)', soft: 'var(--error-bg)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-bg)' },
        // Always-dark chrome (sidebar / hero / footer) — same in light + dark.
        dark: {
          sidebar: 'var(--dark-sidebar)',
          panel: 'var(--dark-panel)',
          border: 'var(--dark-border)',
        },
      },
      borderRadius: {
        // App's rounded scale (fixed px, per the Phase 1 token table) — NOT the
        // shadcn calc() convention. shadcn primitives that use rounded-md/-lg/-sm
        // pick up these app values automatically.
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
        full: '9999px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        md: 'var(--shadow-md)',
        dropdown: 'var(--shadow-dropdown)',
        modal: 'var(--shadow-modal)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
