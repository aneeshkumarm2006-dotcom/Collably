/**
 * Chat palette — premium messenger feel in the app's BLUE brand (not WhatsApp
 * green). Outgoing bubbles are solid accent blue with white text (iMessage-style);
 * incoming sit on the card surface; the thread uses a clean neutral canvas.
 * Centralised so row, bubble, composer and thread stay consistent + theme-aware.
 */
import { useTheme } from '@/components/ThemeProvider';

export function useChatPalette() {
  const { colors, isDark } = useTheme();
  return {
    colors,
    isDark,
    /** Thread background (clean neutral, not WhatsApp cream). */
    chatBg: isDark ? colors.bg : '#EBEEF3',
    /** Outgoing bubble — solid brand blue, white text. */
    outBg: colors.accent,
    outText: '#FFFFFF',
    /** Incoming bubble. */
    inBg: colors.card,
    inText: colors.text,
    /** Accents (send button, unread pill, active filter, row ticks). */
    accent: colors.accent,
    accentDeep: isDark ? '#2D88FF' : '#0A5DC9',
    /** Ticks/time ON the blue outgoing bubble (light). */
    metaOut: 'rgba(255,255,255,0.72)',
    tickOut: 'rgba(255,255,255,0.65)',
    tickOutRead: '#CDE5FF',
    /** Time on incoming bubble. */
    metaIn: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(11,20,26,0.45)',
    /** Centered date / system pill. */
    pillBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    pillText: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(11,20,26,0.55)',
  };
}
