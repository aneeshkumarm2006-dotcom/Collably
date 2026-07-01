/**
 * Small date helpers for the chat surface (bubble timestamps + day separators).
 * Kept separate from `lib/format.ts` because chat needs clock time + relative
 * day labels the rest of the app doesn't, but the absolute date/time formatting
 * itself defers to the shared formatters so locale stays consistent app-wide.
 */
import { formatDate, formatTime } from '@/lib/format';

/** Whether two ISO timestamps fall on the same calendar day (local time). */
export function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** "3:45 PM": the per-bubble clock time. */
export function shortTime(iso: string): string {
  return formatTime(iso);
}

/** "Today" / "Yesterday" / "12 Jun 2026": the date-separator pill label. */
export function dayLabel(iso: string): string {
  const now = new Date();
  const todayIso = now.toISOString();
  if (sameDay(iso, todayIso)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(iso, yesterday.toISOString())) return 'Yesterday';
  return formatDate(iso);
}
