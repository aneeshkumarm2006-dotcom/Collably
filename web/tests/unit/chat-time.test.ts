import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate } from '@/lib/format';
import { dayLabel, sameDay, shortTime } from '@/lib/chat/time';

describe('sameDay', () => {
  it('is true for two timestamps on the same calendar day', () => {
    // Both at midday UTC so they share a local calendar day in every timezone.
    expect(sameDay('2026-06-15T12:00:00.000Z', '2026-06-15T12:30:00.000Z')).toBe(true);
  });

  it('is false for timestamps on different calendar days', () => {
    expect(sameDay('2026-06-15T12:00:00.000Z', '2026-06-17T12:00:00.000Z')).toBe(false);
  });

  it('distinguishes the same day-of-month across different months/years', () => {
    expect(sameDay('2026-06-15T12:00:00.000Z', '2026-07-15T12:00:00.000Z')).toBe(false);
    expect(sameDay('2025-06-15T12:00:00.000Z', '2026-06-15T12:00:00.000Z')).toBe(false);
  });
});

describe('shortTime', () => {
  it('renders an h:mm clock time with a meridiem (timezone-agnostic shape)', () => {
    const t = shortTime('2026-06-15T15:45:00.000Z');
    expect(t).toMatch(/\d{1,2}:\d{2}/);
    expect(t).toMatch(/(a\.?m\.?|p\.?m\.?)/i);
  });

  it('returns an empty string for an unparseable timestamp (delegates to formatTime)', () => {
    expect(shortTime('not-a-date')).toBe('');
  });
});

describe('dayLabel', () => {
  // dayLabel reads `new Date()` for "now"; freeze it so the relative labels are deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels the current day 'Today'", () => {
    expect(dayLabel(new Date().toISOString())).toBe('Today');
  });

  it("labels the previous day 'Yesterday'", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(dayLabel(yesterday)).toBe('Yesterday');
  });

  it('falls back to the absolute date for older timestamps', () => {
    const older = '2026-06-01T12:00:00.000Z';
    expect(dayLabel(older)).toBe(formatDate(older));
    expect(dayLabel(older)).not.toBe('Today');
    expect(dayLabel(older)).not.toBe('Yesterday');
  });

  it('falls back to the absolute date for future timestamps', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(dayLabel(tomorrow)).toBe(formatDate(tomorrow));
  });
});
