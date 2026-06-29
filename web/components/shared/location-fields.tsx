'use client';

import { MapPin } from 'lucide-react';

import type { GeoLocation } from '@/lib/shared';
import { CITY_NAMES, COUNTRIES, REGIONS, locationForCity } from '@/lib/locations';
import { Autocomplete } from '@/components/shared/autocomplete';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * LocationFields — City / Region / Country autocompletes wired to the shared
 * Canada-first location data (`@/lib/locations`, ported from `mobile`). Choosing
 * a city from the suggestions auto-fills its region + country; every field still
 * accepts free text, so anything not listed can be typed. Region + country are
 * laid out side-by-side on `sm+`.
 *
 * Reused by onboarding (Phase 5) and later by profile edit + campaign create.
 */
export interface LocationFieldsProps {
  value: GeoLocation;
  onChange: (next: GeoLocation) => void;
  /** Prefix for the field ids (so multiple instances on a page stay unique). */
  idPrefix?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationFields({
  value,
  onChange,
  idPrefix = 'loc',
  disabled,
  className,
}: LocationFieldsProps) {
  const setField = (partial: Partial<GeoLocation>) => onChange({ ...value, ...partial });

  /** Picking a known city auto-fills its region + country (without clobbering a value the user already typed for an unknown city). */
  const selectCity = (city: string) => {
    const loc = locationForCity(city);
    setField({
      city,
      state: loc?.state ?? value.state,
      country: loc?.country ?? value.country,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Autocomplete
          id={`${idPrefix}-city`}
          icon={<MapPin />}
          options={CITY_NAMES}
          value={value.city ?? ''}
          onValueChange={(city) => setField({ city })}
          onSelect={selectCity}
          placeholder="Start typing your city…"
          disabled={disabled}
          autoComplete="address-level2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-region`}>State / Region</Label>
          <Autocomplete
            id={`${idPrefix}-region`}
            options={REGIONS}
            value={value.state ?? ''}
            onValueChange={(state) => setField({ state })}
            placeholder="e.g. Ontario"
            disabled={disabled}
            autoComplete="address-level1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-country`}>Country</Label>
          <Autocomplete
            id={`${idPrefix}-country`}
            options={COUNTRIES}
            value={value.country ?? ''}
            onValueChange={(country) => setField({ country })}
            placeholder="e.g. Canada"
            disabled={disabled}
            autoComplete="country-name"
          />
        </div>
      </div>
    </div>
  );
}
