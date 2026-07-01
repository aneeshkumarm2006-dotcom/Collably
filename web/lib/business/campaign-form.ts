/**
 * Campaign create/edit form model + payload mapping (Phase 8). Framework-neutral
 * (no React) so the form component, prefill, and validation share one source of
 * truth, and the submitted body matches the backend's `campaignCreateSchema`
 * exactly (`backend/src/routes/campaigns.ts`).
 *
 * Numeric inputs are held as strings (the natural `<input>` value) and coerced on
 * submit. The domain has no "spots" model, so the form has no capacity field,
 * consistent with the rest of the build; min-followers gates audience size.
 */
import type {
  Category,
  ContentType,
  GeoLocation,
  GeoPoint,
  Platform,
  RewardType,
} from '@/lib/shared';
import type { CampaignInput } from '@/lib/api/resources';
import type { PublicCampaign } from '@/lib/api/types';

export const TITLE_MAX = 160;
export const DESCRIPTION_MAX = 5000;
export const REWARD_DESC_MAX = 1000;
export const MAX_DELIVERABLES = 20;
export const MAX_TAGS = 30;
export const TAG_MAX_LEN = 40;

export interface DeliverableForm {
  platform: Platform;
  contentType: ContentType;
  quantity: number;
  requirements: string;
}

/** Precise pin carried over on edit so a coarse city edit can't wipe an existing
 * pin (Phase 11 builds the map editor that actually sets these). */
export interface LocationPin {
  coordinates?: GeoPoint;
  address?: string;
  placeId?: string;
}

export interface CampaignForm {
  title: string;
  description: string;
  category: Category | null;
  isRemote: boolean;
  location: GeoLocation;
  locationPin?: LocationPin;
  reward: { type: RewardType; description: string; estimatedValue: string };
  deliverables: DeliverableForm[];
  /** `yyyy-mm-dd` (date input value) or '' for no deadline. */
  deadline: string;
  minFollowers: string;
  tags: string[];
  coverImage: string | null;
}

export function emptyDeliverable(): DeliverableForm {
  return { platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: '' };
}

export function emptyCampaignForm(): CampaignForm {
  return {
    title: '',
    description: '',
    category: null,
    isRemote: false,
    location: {},
    reward: { type: 'Product', description: '', estimatedValue: '' },
    deliverables: [emptyDeliverable()],
    deadline: '',
    minFollowers: '0',
    tags: [],
    coverImage: null,
  };
}

/** ISO date → `yyyy-mm-dd` for a `<input type="date">`, or '' if unparseable. */
function toDateInput(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Prefill the form from an owned campaign (the edit screen). */
export function campaignFormFromCampaign(c: PublicCampaign): CampaignForm {
  const loc = c.location ?? {};
  return {
    title: c.title ?? '',
    description: c.description ?? '',
    category: (c.category as Category) ?? null,
    isRemote: Boolean(c.isRemote),
    location: {
      ...(loc.city ? { city: loc.city } : {}),
      ...(loc.state ? { state: loc.state } : {}),
      ...(loc.country ? { country: loc.country } : {}),
    },
    // Owner responses carry the exact pin (locationPrecise), so keep it so a coarse
    // edit round-trips it back instead of dropping it.
    locationPin: {
      ...(loc.coordinates ? { coordinates: loc.coordinates } : {}),
      ...(loc.address ? { address: loc.address } : {}),
      ...(loc.placeId ? { placeId: loc.placeId } : {}),
    },
    reward: {
      type: c.reward?.type ?? 'Product',
      description: c.reward?.description ?? '',
      estimatedValue:
        typeof c.reward?.estimatedValue === 'number' ? String(c.reward.estimatedValue) : '',
    },
    deliverables:
      c.deliverables && c.deliverables.length > 0
        ? c.deliverables.map((d) => ({
            platform: d.platform,
            contentType: d.contentType,
            quantity: d.quantity ?? 1,
            requirements: d.requirements ?? '',
          }))
        : [emptyDeliverable()],
    deadline: toDateInput(c.deadline),
    minFollowers: String(c.minFollowers ?? 0),
    tags: c.tags ?? [],
    coverImage: c.coverImage ?? null,
  };
}

export interface CampaignFormErrors {
  title?: string;
  description?: string;
  category?: string;
  rewardDescription?: string;
  estimatedValue?: string;
  minFollowers?: string;
  deliverables?: string;
}

/** Validate the form (mirrors the backend zod schema). Empty object ⇒ valid. */
export function validateCampaignForm(f: CampaignForm): CampaignFormErrors {
  const errors: CampaignFormErrors = {};
  if (!f.title.trim()) errors.title = 'Give your campaign a title.';
  else if (f.title.trim().length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;

  if (!f.description.trim()) errors.description = 'Describe what you’re looking for.';

  if (!f.category) errors.category = 'Pick a category.';

  if (!f.reward.description.trim()) errors.rewardDescription = 'Describe the reward.';

  const value = f.reward.estimatedValue.trim();
  if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
    errors.estimatedValue = 'Enter a valid amount (or leave blank).';
  }

  const min = f.minFollowers.trim();
  if (min !== '' && (!Number.isInteger(Number(min)) || Number(min) < 0)) {
    errors.minFollowers = 'Enter a whole number (0 to accept all).';
  }

  if (f.deliverables.length === 0) {
    errors.deliverables = 'Add at least one deliverable.';
  } else if (f.deliverables.some((d) => !Number.isInteger(d.quantity) || d.quantity < 1)) {
    errors.deliverables = 'Each deliverable needs a quantity of 1 or more.';
  }

  return errors;
}

export function hasErrors(errors: CampaignFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Map the form to the `POST`/`PUT /api/campaigns` body, dropping empty fields. */
export function toCampaignPayload(f: CampaignForm): CampaignInput {
  const coarse: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };
  const pin = f.locationPin ?? {};
  const location = {
    ...coarse,
    ...(pin.coordinates ? { coordinates: pin.coordinates } : {}),
    ...(pin.address ? { address: pin.address } : {}),
    ...(pin.placeId ? { placeId: pin.placeId } : {}),
  };

  const estimatedValue = f.reward.estimatedValue.trim();
  const minFollowers = f.minFollowers.trim();

  return {
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category as Category,
    isRemote: f.isRemote,
    ...(!f.isRemote && Object.keys(location).length ? { location } : {}),
    reward: {
      type: f.reward.type,
      description: f.reward.description.trim(),
      ...(estimatedValue !== '' ? { estimatedValue: Number(estimatedValue) } : {}),
    },
    deliverables: f.deliverables.map((d) => ({
      platform: d.platform,
      contentType: d.contentType,
      quantity: d.quantity,
      ...(d.requirements.trim() ? { requirements: d.requirements.trim() } : {}),
    })),
    ...(f.deadline ? { deadline: new Date(f.deadline).toISOString() } : {}),
    minFollowers: minFollowers !== '' ? Number(minFollowers) : 0,
    tags: f.tags,
    coverImage: f.coverImage,
  };
}
