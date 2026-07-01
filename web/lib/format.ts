/**
 * Formatting + small domain helpers, ported from `mobile/lib/utils.ts` so the
 * website renders numbers, dates, countdowns and rewards identically to the app.
 * (Phase 2 expands the data layer; these are the pieces the Phase 1 shared
 * components depend on.)
 */
import type { CampaignReward } from '@/lib/shared';

// --- Numbers ------------------------------------------------------------------

/** 1500 → "1.5K", 2_400_000 → "2.4M". Used for follower counts and stats. */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs < 1000) return String(value);
  if (abs < 1_000_000) return `${trimZero(value / 1000)}K`;
  if (abs < 1_000_000_000) return `${trimZero(value / 1_000_000)}M`;
  return `${trimZero(value / 1_000_000_000)}B`;
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** "$2,000": Canada-first currency (app is Canada-first/global). */
export function formatCurrency(value: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * "$180" / "$2.5K" / "$1.2M": compact currency for tight surfaces (map pins,
 * value pills). Keeps the `$` prefix but abbreviates the magnitude.
 */
export function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  if (Math.abs(value) < 1000) return `$${Math.round(value)}`;
  return `$${formatCompactNumber(value)}`;
}

// --- Dates / countdowns -------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from now until `deadline` (negative if past). */
export function daysUntil(deadline: string | Date): number {
  const d = toDate(deadline);
  if (!d) return 0;
  return Math.ceil((d.getTime() - Date.now()) / MS_PER_DAY);
}

/** "Due today", "2 days left", "Overdue by 3 days": deadline chips. */
export function formatCountdown(deadline: string | Date): string {
  const days = daysUntil(deadline);
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;
  if (days === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(days)} days`;
}

export type Urgency = 'normal' | 'warn' | 'danger';

/** Maps a deadline to the countdown chip color (per the reference anatomy). */
export function deadlineUrgency(deadline: string | Date): Urgency {
  const days = daysUntil(deadline);
  if (days < 0) return 'danger';
  if (days <= 2) return 'warn';
  return 'normal';
}

/** True once a deadline has passed (used to flag overdue collabs). */
export function isOverdue(deadline: string | Date): boolean {
  const d = toDate(deadline);
  return d ? d.getTime() < Date.now() : false;
}

/** "12 Jun 2026": compact, locale-stable absolute date. */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "12 Jun": day + month only (deadline chips, where the year is implied). */
export function formatDateShort(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "3:45 PM": clock time (chat bubbles). Canada-first, 12-hour. */
export function formatTime(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** "2h ago", "3d ago", "just now": relative time for notifications/feeds. */
export function formatRelativeTime(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

// --- Domain helpers -----------------------------------------------------------

/** One-line reward summary, e.g. "Free product worth $2,000" / "Experience". */
export function formatReward(reward: CampaignReward): string {
  const label = reward.description || reward.type;
  if (typeof reward.estimatedValue === 'number' && reward.estimatedValue > 0) {
    return `${label} worth ${formatCurrency(reward.estimatedValue)}`;
  }
  return label;
}

/** Best-effort initials for avatar fallbacks: "Anees Kumar" → "AK". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
