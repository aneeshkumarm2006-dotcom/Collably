/**
 * Creator profile-completion score — powers the dashboard home "complete your
 * profile" widget. Counts the profile-editable fields a creator can fill on the
 * `/dashboard/creator/profile` page (so every "missing" item is actionable),
 * returning a percent + the list of what's left.
 */
import type { CreatorProfile } from '@/lib/shared';

export interface ProfileCompletion {
  percent: number;
  completed: number;
  total: number;
  /** Human labels for the still-empty sections. */
  missing: string[];
}

function hasAnySocial(profile: CreatorProfile): boolean {
  const s = profile.socialHandles ?? {};
  return Boolean(s.instagram?.handle || s.youtube?.handle || s.tiktok?.handle);
}

export function creatorProfileCompletion(profile: CreatorProfile): ProfileCompletion {
  const checks: { label: string; done: boolean }[] = [
    { label: 'Add a bio', done: Boolean(profile.bio?.trim()) },
    { label: 'Pick your niche', done: (profile.niche?.length ?? 0) > 0 },
    { label: 'Set your location', done: Boolean(profile.location?.city?.trim()) },
    { label: 'Connect a platform', done: hasAnySocial(profile) },
    { label: 'Choose content types', done: (profile.contentTypes?.length ?? 0) > 0 },
    { label: 'Add portfolio work', done: (profile.portfolio?.length ?? 0) > 0 },
  ];

  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;
  return {
    percent: Math.round((completed / total) * 100),
    completed,
    total,
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}
