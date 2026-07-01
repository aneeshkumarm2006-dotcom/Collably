/**
 * Business-onboarding form model + payload mapping. Framework-neutral, ported
 * from `mobile/app/(onboarding)/business.tsx` so the website and app submit the
 * exact same `PUT /api/profile/business` body (backend: `businessProfileSchema`).
 *
 * Business socials are plain free-text strings (handle or URL), unlike the
 * creator's verified handle+link pairs.
 */
import type { GeoLocation, Category, BusinessProfile } from '@/lib/shared';
import type { BusinessProfileInput } from '@/lib/api/resources';

export type BusinessForm = {
  businessName: string;
  description: string;
  category: Category | null;
  location: GeoLocation;
  website: string;
  socialLinks: { instagram: string; youtube: string; tiktok: string };
  logo: string | null;
};

export function emptyBusinessForm(name = ''): BusinessForm {
  return {
    businessName: name,
    description: '',
    category: null,
    location: {},
    website: '',
    socialLinks: { instagram: '', youtube: '', tiktok: '' },
    logo: null,
  };
}

/** Prefill the form from an existing business profile (the dashboard edit screen). */
export function businessFormFromProfile(p: BusinessProfile): BusinessForm {
  return {
    businessName: p.businessName ?? '',
    description: p.description ?? '',
    category: (p.category as Category) ?? null,
    location: {
      ...(p.location?.city ? { city: p.location.city } : {}),
      ...(p.location?.state ? { state: p.location.state } : {}),
      ...(p.location?.country ? { country: p.location.country } : {}),
    },
    website: p.website ?? '',
    socialLinks: {
      instagram: p.socialLinks?.instagram ?? '',
      youtube: p.socialLinks?.youtube ?? '',
      tiktok: p.socialLinks?.tiktok ?? '',
    },
    logo: p.logo ?? null,
  };
}

/** Map the form to the `PUT /api/profile/business` body, dropping empty fields. */
export function toBusinessPayload(f: BusinessForm): BusinessProfileInput {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };
  const social = {
    ...(f.socialLinks.instagram.trim() ? { instagram: f.socialLinks.instagram.trim() } : {}),
    ...(f.socialLinks.youtube.trim() ? { youtube: f.socialLinks.youtube.trim() } : {}),
    ...(f.socialLinks.tiktok.trim() ? { tiktok: f.socialLinks.tiktok.trim() } : {}),
  };
  return {
    businessName: f.businessName.trim(),
    // `category` is guaranteed set before submit (step 1 gates on it).
    category: f.category as Category,
    ...(f.description.trim() ? { description: f.description.trim() } : {}),
    ...(Object.keys(trimmedLoc).length ? { location: trimmedLoc } : {}),
    ...(f.website.trim() ? { website: f.website.trim() } : {}),
    ...(Object.keys(social).length ? { socialLinks: social } : {}),
    ...(f.logo ? { logo: f.logo } : {}),
  };
}
