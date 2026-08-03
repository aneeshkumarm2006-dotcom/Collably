import type { Config } from 'tailwindcss';

/**
 * Collably theme, matched to the live mobile app's LIGHT palette in
 * `app/mobile/constants/theme.ts` (Meta-blue accent on a cool-grey "paper"
 * background, Facebook-green for success, amber for warnings, red for danger).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        muted: '#566173',
        faint: '#8A93A3',
        hair: '#E3E8F1',
        // Softer inner hairline (mockup --line-2) for list rows / dividers.
        hair2: '#EDF0F6',
        page: '#EEF1F7',
        elev: '#F6F8FC',
        card: '#FFFFFF',
        brand: { DEFAULT: '#1877F2', deep: '#0E5FD1', soft: '#E8F1FE' },
        success: { DEFAULT: '#31A24C', soft: '#E3F1E6' },
        // Semantic status tokens matched to the approved mockup.
        good: { DEFAULT: '#158A5B', soft: '#E2F5EC' },
        warn: { DEFAULT: '#B26F12', soft: '#FBF0DC' },
        danger: { DEFAULT: '#D23636', soft: '#FBE8E8' },
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
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19,26,46,0.05), 0 10px 30px rgba(19,26,46,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
