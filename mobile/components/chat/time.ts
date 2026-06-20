/** Lightweight time formatting for chat (no Intl dependency — Hermes-safe). */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "9:05 PM" — clock time for a message bubble. */
export function shortTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

/** Whether two ISO timestamps fall on the same calendar day. */
export function sameDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Centered date-separator label: "Today" / "Yesterday" / "Mon, 5 Jun". */
export function dayLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAYS[d.getDay()];
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Time today, "Yesterday", a weekday this week, else "Mon 5" — for list rows. */
export function relativeStamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return shortTime(iso);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAYS[d.getDay()];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
