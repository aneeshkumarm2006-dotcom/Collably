/**
 * Notification presentation helpers — the per-type icon + dot tone, the
 * deep-link → web-route mapping, and the mapper that feeds the `NotificationBell`
 * dropdown. Shared by the topbar bell and the full notifications page (Phase 7).
 *
 * The backend stores a `deepLinkPath` aimed at the mobile app's navigation; here
 * we normalize it to a website route. Phase 10 refines the per-type targets and
 * adds live updates — this is the best-effort baseline.
 */
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
  type LucideIcon,
} from 'lucide-react';

import type { Notification } from '@/lib/shared';
import { formatRelativeTime } from '@/lib/format';
import type { NotificationDot, NotificationItem } from '@/components/shared/notification-bell';

type Role = 'creator' | 'business';

/** Icon + dot tone per known notification type (falls back to a neutral bell). */
const VISUALS: Record<string, { icon: LucideIcon; dot: NotificationDot }> = {
  account_created: { icon: Sparkles, dot: 'brand' },
  password_reset: { icon: Bell, dot: 'neutral' },
  new_application: { icon: FileText, dot: 'info' },
  application_accepted: { icon: Check, dot: 'success' },
  application_rejected: { icon: X, dot: 'danger' },
  submission_received: { icon: Upload, dot: 'info' },
  submission_verified: { icon: BadgeCheck, dot: 'success' },
  revision_requested: { icon: RefreshCw, dot: 'warn' },
  campaign_expiring: { icon: Clock, dot: 'warn' },
  new_message: { icon: MessageSquare, dot: 'brand' },
};

export function notificationVisual(type: string): { icon: LucideIcon; dot: NotificationDot } {
  return VISUALS[type] ?? { icon: Bell, dot: 'brand' };
}

/** Static icon-chip classes per dot tone (Tailwind needs the full class names). */
export const NOTIF_CHIP_CLASS: Record<NotificationDot, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-secondary text-muted',
};

/** Website-section routes a notification can deep-link into, per role. */
const KNOWN_SECTIONS = [
  'applications',
  'collabs',
  'submissions',
  'campaigns',
  'messages',
  'notifications',
  'profile',
  'settings',
  'explore',
];

/**
 * Map a stored `deepLinkPath` to a real website route for the given role.
 * Public detail routes pass through; collab detail (no dedicated web page yet)
 * resolves to the collabs list; app-style section links re-root under the role's
 * dashboard.
 */
export function notificationHref(deepLinkPath: string | undefined, role: Role): string {
  const base = `/dashboard/${role}`;
  const raw = (deepLinkPath ?? '').trim();
  if (!raw || raw === '/') return base;

  // Public routes (campaign / business / creator) are valid as-is.
  if (/^\/(campaign|business|creator)\//.test(raw)) return raw;

  // A chat deep link (`/chat/:id`) → the role's thread route.
  const chat = raw.match(/^\/chat\/([^/]+)/);
  if (chat) return `${base}/messages/${chat[1]}`;

  // A collab detail target maps to the collabs list (no per-collab page yet).
  if (/\/collabs\/[^/]+/.test(raw)) return `${base}/collabs`;

  // Already a dashboard route → keep, but re-root to the current role's area.
  const dash = raw.match(/^\/dashboard\/(?:creator|business)(\/.*)?$/);
  if (dash) return `${base}${dash[1] ?? ''}`;

  // App-style section link (e.g. "/applications") → the dashboard section.
  const section = raw.replace(/^\//, '').split('/')[0];
  if (KNOWN_SECTIONS.includes(section)) return `${base}/${section}`;

  return base;
}

/** Map notification records → `NotificationBell` items (icon dot + relative time + link). */
export function toNotificationItems(notifications: Notification[], role: Role): NotificationItem[] {
  return notifications.map((n) => ({
    id: n._id,
    text: n.message,
    time: formatRelativeTime(n.createdAt),
    unread: !n.isRead,
    dot: notificationVisual(n.type).dot,
    href: notificationHref(n.deepLinkPath, role),
  }));
}
