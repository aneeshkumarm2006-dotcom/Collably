import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadgeCheck,
  Bell,
  Check,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { Notification } from '@/lib/shared';
import {
  notificationHref,
  notificationVisual,
  toNotificationItems,
} from '@/lib/notifications';

const NOW = new Date('2026-06-29T12:00:00.000Z');

describe('notificationVisual — known types', () => {
  const cases = [
    ['account_created', Sparkles, 'brand'],
    ['password_reset', Bell, 'neutral'],
    ['new_application', FileText, 'info'],
    ['application_accepted', Check, 'success'],
    ['application_rejected', X, 'danger'],
    ['submission_received', Upload, 'info'],
    ['submission_verified', BadgeCheck, 'success'],
    ['revision_requested', RefreshCw, 'warn'],
    ['campaign_expiring', Clock, 'warn'],
    ['new_message', MessageSquare, 'brand'],
  ] as const;

  it.each(cases)('maps %s to its icon + dot', (type, icon, dot) => {
    const visual = notificationVisual(type);
    expect(visual.icon).toBe(icon);
    expect(visual.dot).toBe(dot);
  });
});

describe('notificationVisual — fallback', () => {
  it('falls back to the Bell icon with a brand dot for an unknown type', () => {
    const visual = notificationVisual('something_new_in_phase_99');
    expect(visual.icon).toBe(Bell);
    expect(visual.dot).toBe('brand');
  });

  it('falls back for an empty string type', () => {
    expect(notificationVisual('').icon).toBe(Bell);
    expect(notificationVisual('').dot).toBe('brand');
  });
});

describe('notificationHref — empty / base cases', () => {
  it('returns the role base for undefined, empty, "/" and whitespace-only paths', () => {
    expect(notificationHref(undefined, 'creator')).toBe('/dashboard/creator');
    expect(notificationHref('', 'creator')).toBe('/dashboard/creator');
    expect(notificationHref('/', 'creator')).toBe('/dashboard/creator');
    expect(notificationHref('   ', 'creator')).toBe('/dashboard/creator');
  });

  it('keys the base off the role', () => {
    expect(notificationHref(undefined, 'business')).toBe('/dashboard/business');
  });
});

describe('notificationHref — public detail routes pass through', () => {
  it.each([
    '/campaign/abc123',
    '/business/biz1',
    '/creator/cre1',
  ])('passes %s through unchanged regardless of role', (path) => {
    expect(notificationHref(path, 'creator')).toBe(path);
    expect(notificationHref(path, 'business')).toBe(path);
  });

  it('only treats the singular /campaign/:id as public (plural is a dashboard section)', () => {
    expect(notificationHref('/campaign/x1', 'creator')).toBe('/campaign/x1');
    // "/campaigns/x1" is NOT a public route; "campaigns" is a known section.
    expect(notificationHref('/campaigns/x1', 'creator')).toBe('/dashboard/creator/campaigns');
  });
});

describe('notificationHref — chat deep links', () => {
  it('maps /chat/:id to the role messages thread', () => {
    expect(notificationHref('/chat/conv1', 'creator')).toBe('/dashboard/creator/messages/conv1');
    expect(notificationHref('/chat/conv9', 'business')).toBe('/dashboard/business/messages/conv9');
  });

  it('captures only the first segment after /chat/', () => {
    expect(notificationHref('/chat/conv1/extra', 'creator')).toBe(
      '/dashboard/creator/messages/conv1',
    );
  });
});

describe('notificationHref — collab detail → collabs list', () => {
  it('maps a bare /collabs/:id to the role collabs list', () => {
    expect(notificationHref('/collabs/app1', 'creator')).toBe('/dashboard/creator/collabs');
    expect(notificationHref('/collabs/app1', 'business')).toBe('/dashboard/business/collabs');
  });

  it('maps a dashboard collabs-detail path to the role collabs list (collabs rule wins)', () => {
    expect(notificationHref('/dashboard/business/collabs/app1', 'creator')).toBe(
      '/dashboard/creator/collabs',
    );
  });
});

describe('notificationHref — dashboard re-rooting', () => {
  it('re-roots a cross-role dashboard path to the current role, keeping the tail', () => {
    expect(notificationHref('/dashboard/business/applications', 'creator')).toBe(
      '/dashboard/creator/applications',
    );
    expect(notificationHref('/dashboard/creator/settings', 'business')).toBe(
      '/dashboard/business/settings',
    );
  });

  it('keeps a deep tail when re-rooting', () => {
    expect(notificationHref('/dashboard/business/submissions/42', 'creator')).toBe(
      '/dashboard/creator/submissions/42',
    );
  });

  it('re-roots a bare /dashboard/<role> to the current role base', () => {
    expect(notificationHref('/dashboard/business', 'creator')).toBe('/dashboard/creator');
  });

  it('is a no-op for a same-role dashboard path', () => {
    expect(notificationHref('/dashboard/creator/profile', 'creator')).toBe(
      '/dashboard/creator/profile',
    );
  });
});

describe('notificationHref — known section links', () => {
  it.each([
    'applications',
    'submissions',
    'campaigns',
    'messages',
    'notifications',
    'profile',
    'settings',
    'explore',
  ])('maps app-style /%s to the role dashboard section', (section) => {
    expect(notificationHref(`/${section}`, 'creator')).toBe(`/dashboard/creator/${section}`);
  });

  it('drops a trailing id on a known section link', () => {
    expect(notificationHref('/applications/123', 'creator')).toBe(
      '/dashboard/creator/applications',
    );
  });
});

describe('notificationHref — unknown paths fall back to base', () => {
  it('returns the role base for an unrecognized first segment', () => {
    expect(notificationHref('/random', 'creator')).toBe('/dashboard/creator');
    expect(notificationHref('/foo/bar', 'business')).toBe('/dashboard/business');
  });
});

describe('toNotificationItems', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
      _id: 'n1',
      userId: 'u1',
      type: 'new_application',
      message: 'You have a new application',
      deepLinkPath: '/applications/5',
      isRead: false,
      createdAt: new Date(NOW.getTime() - 5 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  it('maps a record into a bell item (id, text, time, unread, dot, href)', () => {
    const [item] = toNotificationItems([makeNotification()], 'creator');
    expect(item).toEqual({
      id: 'n1',
      text: 'You have a new application',
      time: '5m ago',
      unread: true,
      dot: 'info', // new_application → info
      href: '/dashboard/creator/applications',
    });
  });

  it('sets unread=false when the record is read', () => {
    const [item] = toNotificationItems([makeNotification({ isRead: true })], 'creator');
    expect(item.unread).toBe(false);
  });

  it('derives the dot from the notification type and the href from role + deepLinkPath', () => {
    const [item] = toNotificationItems(
      [
        makeNotification({
          type: 'application_rejected',
          deepLinkPath: '/dashboard/creator/applications',
        }),
      ],
      'business',
    );
    expect(item.dot).toBe('danger');
    expect(item.href).toBe('/dashboard/business/applications');
  });

  it('uses a brand dot for an unknown type', () => {
    const [item] = toNotificationItems([makeNotification({ type: 'mystery_type' })], 'creator');
    expect(item.dot).toBe('brand');
  });

  it('maps an empty list to an empty array', () => {
    expect(toNotificationItems([], 'creator')).toEqual([]);
  });

  it('preserves order and maps multiple records', () => {
    const items = toNotificationItems(
      [
        makeNotification({ _id: 'a', message: 'First' }),
        makeNotification({ _id: 'b', message: 'Second' }),
      ],
      'creator',
    );
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(items.map((i) => i.text)).toEqual(['First', 'Second']);
  });
});
