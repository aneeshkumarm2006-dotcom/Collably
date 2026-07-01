/**
 * Shared state for the 7-step campaign create/edit flow (PRD §7.4). The screen
 * (Phase 13) owns one `CampaignFormState`, passes it + a `patch` updater to each
 * Step, and maps it to the `POST/PUT /api/campaigns` body on submit.
 *
 * Steps are controlled and presentational: they read `value` and call
 * `patch(partial)`. Per-step validity lives in `validateStep` so the screen can
 * gate the "Next" button without duplicating rules.
 */
import type { Category, RewardType } from '@/constants';
import type { Campaign, CampaignDeliverable, CampaignReward, CampaignLocation } from '@/types';

export type CampaignFormState = {
  title: string;
  description: string;
  category: Category | null;
  coverImage: string | null;
  isRemote: boolean;
  /** Coarse city/state/country + (when pinned) an exact `coordinates`/`address`. */
  location: CampaignLocation;
  reward: { type: RewardType | null; description: string; estimatedValue?: number };
  deliverables: CampaignDeliverable[];
  deadline: string | null; // ISO string
  minFollowers: number;
  /** Max creators to accept before the campaign auto-closes (default 1). */
  maxCreators: number;
  tags: string[];
};

/** A fresh, empty form (used by the "new campaign" screen). */
export function emptyCampaignForm(): CampaignFormState {
  return {
    title: '',
    description: '',
    category: null,
    coverImage: null,
    isRemote: false,
    location: {},
    reward: { type: null, description: '', estimatedValue: undefined },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }],
    deadline: null,
    minFollowers: 0,
    maxCreators: 1,
    tags: [],
  };
}

/** Pre-fill the form from an existing campaign (the edit flow). */
export function fromCampaign(c: Campaign): CampaignFormState {
  return {
    title: c.title,
    description: c.description,
    category: c.category,
    coverImage: c.coverImage ?? null,
    isRemote: c.isRemote,
    location: c.location ?? {},
    reward: {
      type: c.reward.type,
      description: c.reward.description,
      estimatedValue: c.reward.estimatedValue,
    },
    deliverables: c.deliverables.length
      ? c.deliverables.map((d) => ({ ...d }))
      : [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }],
    deadline: c.deadline ?? null,
    minFollowers: c.minFollowers,
    maxCreators: c.maxCreators ?? 1,
    tags: [...c.tags],
  };
}

/** Shallow patch helper type the steps receive from the screen. */
export type CampaignFormPatch = (partial: Partial<CampaignFormState>) => void;

/** The 7 steps, in order, with their titles for the stepper. */
export const CAMPAIGN_STEP_TITLES = [
  'Basics',
  'Cover image',
  'Location',
  'Reward',
  'Deliverables',
  'Settings',
  'Review',
] as const;

export const CAMPAIGN_STEP_COUNT = CAMPAIGN_STEP_TITLES.length;

/** Whether a given 1-based step is complete enough to advance. */
export function validateStep(step: number, f: CampaignFormState): boolean {
  switch (step) {
    case 1:
      return f.title.trim().length >= 3 && f.description.trim().length >= 10 && !!f.category;
    case 2:
      return true; // cover image is optional (gradient fallback)
    case 3:
      // On-site campaigns need at least a coarse city, or an exact pin if dropped.
      return f.isRemote || !!f.location.city?.trim() || !!f.location.coordinates;
    case 4:
      return !!f.reward.type && f.reward.description.trim().length > 0;
    case 5:
      return f.deliverables.length > 0 && f.deliverables.every((d) => d.quantity >= 1);
    case 6:
      return !!f.deadline;
    case 7:
      return true;
    default:
      return false;
  }
}

/**
 * Build the location request body for an on-site campaign: the coarse fields plus
 * the exact pin (`coordinates`/`address`/`placeId`) when one was dropped. The
 * server strips any privacy-only fields (`approxCoordinates`, `locationPrecise`)
 * that may ride along from an edit round-trip.
 */
function toLocationPayload(loc: CampaignLocation): CampaignLocation {
  const out: CampaignLocation = {};
  if (loc.city?.trim()) out.city = loc.city.trim();
  if (loc.state?.trim()) out.state = loc.state.trim();
  if (loc.country?.trim()) out.country = loc.country.trim();
  if (loc.coordinates) out.coordinates = loc.coordinates;
  if (loc.address?.trim()) out.address = loc.address.trim();
  if (loc.placeId) out.placeId = loc.placeId;
  return out;
}

/** Map the form to the API request body for create/update. */
export function toCampaignPayload(f: CampaignFormState) {
  const reward: CampaignReward = {
    type: f.reward.type ?? 'Product',
    description: f.reward.description.trim(),
    ...(f.reward.estimatedValue ? { estimatedValue: f.reward.estimatedValue } : {}),
  };
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category,
    coverImage: f.coverImage,
    isRemote: f.isRemote,
    location: f.isRemote ? undefined : toLocationPayload(f.location),
    reward,
    deliverables: f.deliverables,
    deadline: f.deadline,
    minFollowers: f.minFollowers,
    maxCreators: f.maxCreators,
    tags: f.tags,
  };
}
