/**
 * Small, dependency-light formatting + helper utilities used across screens:
 * date/countdown formatting for campaign deadlines, follower-count abbreviation,
 * reward summaries, and a `cn()` className joiner for conditional NativeWind classes.
 */
import type { CampaignReward } from '@/types';

// --- Class names --------------------------------------------------------------

type ClassValue = string | false | null | undefined;

/** Join conditional className strings (NativeWind): cn('p-4', active && 'bg-accent'). */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

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
  // One decimal, but drop a trailing ".0" (1.0K → 1K).
  return n.toFixed(1).replace(/\.0$/, '');
}

// --- Dates / countdowns -------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Parse an ISO string / Date into a Date, or null if invalid. */
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

/**
 * Human countdown for a deadline: "Due today", "2 days left", "Overdue by 3 days".
 * Drives the deadline chips on collab/campaign cards (PRD §7.3, §7.4).
 */
export function formatCountdown(deadline: string | Date): string {
  const days = daysUntil(deadline);
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;
  if (days === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(days)} days`;
}

/** True once a deadline has passed (used to flag overdue collabs). */
export function isOverdue(deadline: string | Date): boolean {
  const d = toDate(deadline);
  return d ? d.getTime() < Date.now() : false;
}

/** "12 Jun 2026" — compact, locale-stable absolute date for detail screens. */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2h ago", "3d ago", "just now" — relative time for notifications/activity feeds. */
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

/** One-line reward summary, e.g. "Free product worth ₹2,000" / "Experience". */
export function formatReward(reward: CampaignReward): string {
  const label = reward.description || reward.type;
  if (typeof reward.estimatedValue === 'number' && reward.estimatedValue > 0) {
    return `${label} worth ₹${reward.estimatedValue.toLocaleString('en-IN')}`;
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
