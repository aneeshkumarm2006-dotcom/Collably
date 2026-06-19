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
        ink: '#1C1E21',
        muted: '#65676B',
        faint: '#8A8D91',
        hair: '#DADDE1',
        page: '#F0F2F5',
        elev: '#F7F8FA',
        card: '#FFFFFF',
        brand: { DEFAULT: '#1877F2', soft: '#E7F0FF' },
        success: { DEFAULT: '#31A24C', soft: '#E3F1E6' },
        warn: { DEFAULT: '#F3A608', soft: '#FCF1DA' },
        danger: { DEFAULT: '#FA383E', soft: '#FDE7E8' },
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
