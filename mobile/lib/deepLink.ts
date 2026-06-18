/**
 * Map a stored notification `deepLinkPath` (PRD §8.2, §9.2) to a navigable route in
 * the creator stack. The backend keeps paths human-readable and role-neutral
 * (e.g. `/applications/:id`, `/collabs/:id`, `/campaign/:id`); this prefixes the
 * `(creator)` group and remaps the few that don't have a 1:1 creator screen
 * (an accepted/rejected application opens its collab detail). Phase 15 generalizes
 * this for every role; for now it covers the creator triggers in §9.2.
 */
import type { Href } from 'expo-router';
import type { UserRole } from '@/constants';

export function resolveCreatorDeepLink(path: string): Href {
  const base = (path.split('?')[0] || '').replace(/\/+$/, '') || '/notifications';

  // Accept/reject notifications point at `/applications/:id`, which the creator
  // views through the collab detail screen.
  const appMatch = base.match(/^\/applications\/([^/]+)$/);
  if (appMatch) return `/(creator)/collabs/${appMatch[1]}` as Href;

  if (
    base.startsWith('/campaign/') ||
    base.startsWith('/collabs/') ||
    base.startsWith('/chat/') ||
    base.startsWith('/business/') ||
    base.startsWith('/creator/') ||
    base === '/applications' ||
    base === '/notifications'
  ) {
    return `/(creator)${base}` as Href;
  }

  // Unknown / business-only target — fall back to the notifications list.
  return '/(creator)/notifications' as Href;
}

/**
 * Map a stored notification `deepLinkPath` to a navigable route in the business
 * stack. Mirrors {@link resolveCreatorDeepLink} for the §9.2 business triggers:
 * `/campaigns/:id/applications` (new application) and
 * `/submissions?applicationId=:id` (submission received). Query strings are
 * preserved for the submissions screen so it can focus the right application.
 */
export function resolveBusinessDeepLink(path: string): Href {
  const [rawBase, query] = path.split('?');
  const base = (rawBase || '').replace(/\/+$/, '') || '/notifications';
  const suffix = query ? `?${query}` : '';

  // New application → that campaign's applicant list.
  const campaignApps = base.match(/^\/campaigns\/([^/]+)\/applications$/);
  if (campaignApps) return `/(business)/campaigns/${campaignApps[1]}/applications` as Href;

  // Submission received → the submissions review screen (keep ?applicationId=).
  if (base === '/submissions') return `/(business)/submissions${suffix}` as Href;

  if (
    base.startsWith('/campaign/') ||
    base.startsWith('/chat/') ||
    base.startsWith('/creator/') ||
    base === '/notifications'
  ) {
    return `/(business)${base}${suffix}` as Href;
  }

  // A single campaign target (e.g. campaign_expiring) → its applicant list.
  const campaign = base.match(/^\/campaigns\/([^/]+)$/);
  if (campaign) return `/(business)/campaigns/${campaign[1]}/applications` as Href;

  // Unknown / creator-only target — fall back to the notifications list.
  return '/(business)/notifications' as Href;
}

/**
 * Role-aware dispatcher used by the push-tap handler (Phase 15). A stored
 * notification's `deepLinkPath` is role-neutral; this picks the resolver for the
 * signed-in user so a tapped push lands in the right navigator. Admins (and any
 * unrecognised role) fall back to the creator resolver's safe default — admins
 * don't receive §9.2 triggers, but a stray tap must never crash navigation.
 */
export function resolveDeepLink(path: string, role: UserRole | null): Href {
  switch (role) {
    case 'business':
      return resolveBusinessDeepLink(path);
    case 'creator':
    default:
      return resolveCreatorDeepLink(path);
  }
}
