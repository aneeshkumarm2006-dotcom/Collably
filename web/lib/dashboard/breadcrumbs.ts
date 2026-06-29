/**
 * Derive the dashboard top-bar breadcrumb trail from the current pathname, so the
 * persistent shell never has to thread per-page breadcrumb props. Section labels
 * reuse the sidebar nav (`DASH_NAV`) to stay in lockstep; a few leaf routes
 * (notifications, submit, new, edit) and id segments are handled specially.
 */
import type { Crumb } from '@/components/shared/dashboard-topbar';
import { DASH_NAV } from '@/components/shared/dashboard-sidebar';

type Role = 'creator' | 'business';

/** Labels for leaf segments that aren't sidebar destinations. */
const EXTRA_LABELS: Record<string, string> = {
  notifications: 'Notifications',
  submit: 'Submit content',
  new: 'New campaign',
  edit: 'Edit',
};

/** A path segment that's a record id (24-hex Mongo id) — never shown as a crumb. */
const isIdSegment = (seg: string) => /^[a-f0-9]{24}$/i.test(seg) || /^\d+$/.test(seg);

function navLabelMap(role: Role): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of [...DASH_NAV[role].main, ...DASH_NAV[role].account]) {
    map[item.href] = item.label;
  }
  return map;
}

export function dashboardBreadcrumbs(pathname: string, role: Role): Crumb[] {
  const root = `/dashboard/${role}`;
  const navLabels = navLabelMap(role);
  const crumbs: Crumb[] = [{ label: 'Dashboard', href: root }];

  const rest = pathname.startsWith(root) ? pathname.slice(root.length) : '';
  const segments = rest.split('/').filter(Boolean);

  let href = root;
  for (const seg of segments) {
    href += `/${seg}`;
    if (isIdSegment(seg)) continue; // don't surface raw ids
    const label = navLabels[href] ?? EXTRA_LABELS[seg];
    if (label) crumbs.push({ label, href });
  }

  // The deepest crumb is the current page — drop its link.
  const last = crumbs[crumbs.length - 1];
  if (last) delete last.href;
  return crumbs;
}
