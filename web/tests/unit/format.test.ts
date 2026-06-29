import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignReward } from '@/lib/shared';
import {
  daysUntil,
  deadlineUrgency,
  formatCompactCurrency,
  formatCompactNumber,
  formatCountdown,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatRelativeTime,
  formatReward,
  formatTime,
  initials,
  isOverdue,
} from '@/lib/format';

// A fixed "now" so every relative/countdown assertion is deterministic.
const NOW = new Date('2026-06-29T12:00:00.000Z');

describe('formatCompactNumber', () => {
  it('passes through values under 1000 verbatim', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatCompactNumber(-5)).toBe('-5');
  });

  it('abbreviates thousands, millions, and billions', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(2_400_000)).toBe('2.4M');
    expect(formatCompactNumber(3_200_000_000)).toBe('3.2B');
  });

  it('trims a trailing .0', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
  });

  it('handles negative magnitudes and non-finite input', () => {
    expect(formatCompactNumber(-1500)).toBe('-1.5K');
    expect(formatCompactNumber(Number.NaN)).toBe('0');
    expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatCurrency', () => {
  it('formats CAD with no fraction digits by default', () => {
    expect(formatCurrency(2000)).toBe('$2,000');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('honors an explicit currency code', () => {
    // en-CA renders USD with the US$ qualifier.
    expect(formatCurrency(50, 'USD')).toContain('50');
  });
});

describe('formatCompactCurrency', () => {
  it('rounds small values and prefixes $', () => {
    expect(formatCompactCurrency(180)).toBe('$180');
    expect(formatCompactCurrency(180.4)).toBe('$180');
  });

  it('abbreviates large values', () => {
    expect(formatCompactCurrency(2500)).toBe('$2.5K');
    expect(formatCompactCurrency(1_200_000)).toBe('$1.2M');
  });

  it('guards non-finite input', () => {
    expect(formatCompactCurrency(Number.NaN)).toBe('$0');
  });
});

describe('date + countdown helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('daysUntil rounds up whole days and goes negative in the past', () => {
    expect(daysUntil('2026-07-01T12:00:00.000Z')).toBe(2);
    expect(daysUntil('2026-06-29T12:00:00.000Z')).toBe(0);
    expect(daysUntil('2026-06-26T12:00:00.000Z')).toBe(-3);
  });

  it('daysUntil returns 0 for unparseable input', () => {
    expect(daysUntil('not-a-date')).toBe(0);
  });

  it('formatCountdown phrases today / future / overdue', () => {
    expect(formatCountdown('2026-06-29T12:00:00.000Z')).toBe('Due today');
    expect(formatCountdown('2026-06-30T12:00:00.000Z')).toBe('1 day left');
    expect(formatCountdown('2026-07-02T12:00:00.000Z')).toBe('3 days left');
    expect(formatCountdown('2026-06-28T12:00:00.000Z')).toBe('Overdue by 1 day');
    expect(formatCountdown('2026-06-26T12:00:00.000Z')).toBe('Overdue by 3 days');
  });

  it('deadlineUrgency maps days-left to a tone', () => {
    expect(deadlineUrgency('2026-07-10T12:00:00.000Z')).toBe('normal');
    expect(deadlineUrgency('2026-06-30T12:00:00.000Z')).toBe('warn');
    expect(deadlineUrgency('2026-06-28T12:00:00.000Z')).toBe('danger');
  });

  it('isOverdue is true only once the deadline has passed', () => {
    expect(isOverdue('2026-06-28T12:00:00.000Z')).toBe(true);
    expect(isOverdue('2026-07-01T12:00:00.000Z')).toBe(false);
    expect(isOverdue('bad-date')).toBe(false);
  });

  it('formatRelativeTime buckets recent timestamps', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 30 * 1000))).toBe('just now');
    expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 60 * 1000))).toBe('5m ago');
    expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 3600 * 1000))).toBe('3h ago');
    expect(formatRelativeTime(new Date(NOW.getTime() - 2 * 86400 * 1000))).toBe('2d ago');
  });

  it('formatRelativeTime falls back to an absolute date past a week', () => {
    expect(formatRelativeTime('2026-06-01T12:00:00.000Z')).toBe(formatDate('2026-06-01T12:00:00.000Z'));
  });
});

describe('absolute date/time formatters', () => {
  it('formatDate renders day-month-year', () => {
    expect(formatDate('2026-06-12T09:00:00.000Z')).toBe('12 Jun 2026');
    expect(formatDate('bad')).toBe('');
  });

  it('formatDateShort drops the year', () => {
    expect(formatDateShort('2026-06-12T09:00:00.000Z')).toBe('12 Jun');
    expect(formatDateShort(null as unknown as string)).toBe('');
  });

  it('formatTime renders a 12-hour clock with a meridiem', () => {
    // Timezone-independent: assert the shape (h:mm + a.m./p.m.), not the exact hour.
    const t = formatTime('2026-06-12T15:45:00.000Z');
    expect(t).toMatch(/\d{1,2}:\d{2}/);
    expect(t).toMatch(/(a\.?m\.?|p\.?m\.?)/i);
  });
});

describe('domain helpers', () => {
  it('formatReward appends the value when present', () => {
    const reward: CampaignReward = { type: 'Product', description: 'Free product', estimatedValue: 2000 };
    expect(formatReward(reward)).toBe('Free product worth $2,000');
  });

  it('formatReward omits the value when zero/absent and falls back to type', () => {
    expect(formatReward({ type: 'Experience', description: '', estimatedValue: 0 })).toBe('Experience');
    expect(formatReward({ type: 'Service', description: 'Spa day' })).toBe('Spa day');
  });

  it('initials takes the first two words, uppercased', () => {
    expect(initials('Anees Kumar')).toBe('AK');
    expect(initials('  maya   bennett  ')).toBe('MB');
    expect(initials('Cher')).toBe('C');
    expect(initials('a b c d')).toBe('AB');
  });
});
