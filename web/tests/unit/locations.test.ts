import { describe, expect, it } from 'vitest';
import {
  CANADIAN_PROVINCES,
  CITIES,
  CITY_NAMES,
  COUNTRIES,
  locationForCity,
  REGIONS,
} from '@/lib/locations';

describe('locationForCity', () => {
  it('returns the region + country for a known Canadian city', () => {
    expect(locationForCity('Toronto')).toEqual({ state: 'Ontario', country: 'Canada' });
  });

  it('returns the region + country for a known international city', () => {
    expect(locationForCity('Tokyo')).toEqual({ state: 'Tokyo', country: 'Japan' });
    expect(locationForCity('Dubai')).toEqual({
      state: 'Dubai',
      country: 'United Arab Emirates',
    });
  });

  it('matches case-insensitively', () => {
    expect(locationForCity('toronto')).toEqual({ state: 'Ontario', country: 'Canada' });
    expect(locationForCity('TORONTO')).toEqual({ state: 'Ontario', country: 'Canada' });
    expect(locationForCity('tOkYo')).toEqual({ state: 'Tokyo', country: 'Japan' });
  });

  it('trims surrounding whitespace before matching', () => {
    expect(locationForCity('  Toronto  ')).toEqual({ state: 'Ontario', country: 'Canada' });
  });

  it('returns the first match (Canada-first) when a city name is ambiguous', () => {
    // "London" exists in both Ontario (Canada) and England (UK); Canada is listed first.
    expect(locationForCity('London')).toEqual({ state: 'Ontario', country: 'Canada' });
  });

  it('handles city names containing punctuation', () => {
    expect(locationForCity("St. John's")).toEqual({
      state: 'Newfoundland and Labrador',
      country: 'Canada',
    });
  });

  it('returns undefined for an unknown city', () => {
    expect(locationForCity('Atlantis')).toBeUndefined();
    expect(locationForCity('')).toBeUndefined();
    expect(locationForCity('   ')).toBeUndefined();
  });

  it('resolves every city in CITIES to its own record', () => {
    for (const record of CITIES) {
      const hit = locationForCity(record.city);
      expect(hit).toBeDefined();
      expect(hit?.country).toBe(
        // first match wins, so ambiguous names resolve to the earliest record
        CITIES.find((c) => c.city.toLowerCase() === record.city.toLowerCase())?.country,
      );
    }
  });
});

describe('CITY_NAMES', () => {
  it('has exactly one entry per city record', () => {
    expect(CITY_NAMES).toHaveLength(CITIES.length);
  });

  it('is the ordered list of city names from CITIES', () => {
    expect(CITY_NAMES).toEqual(CITIES.map((c) => c.city));
  });
});

describe('REGIONS', () => {
  it('is sorted ascending', () => {
    const sorted = [...REGIONS].sort();
    expect(REGIONS).toEqual(sorted);
  });

  it('contains no duplicates', () => {
    expect(new Set(REGIONS).size).toBe(REGIONS.length);
  });

  it('includes Canadian provinces and at least one international region', () => {
    expect(REGIONS).toContain('Ontario');
    expect(REGIONS).toContain('Quebec');
    expect(REGIONS).toContain('Tokyo');
    expect(REGIONS).toContain('California');
  });
});

describe('CANADIAN_PROVINCES', () => {
  it('lists all 13 provinces/territories', () => {
    expect(CANADIAN_PROVINCES).toHaveLength(13);
    expect(CANADIAN_PROVINCES).toContain('Ontario');
    expect(CANADIAN_PROVINCES).toContain('Nunavut');
  });
});

describe('COUNTRIES', () => {
  it('lists Canada first', () => {
    expect(COUNTRIES[0]).toBe('Canada');
  });

  it('includes the other supported countries', () => {
    expect(COUNTRIES).toContain('United States');
    expect(COUNTRIES).toContain('Japan');
    expect(COUNTRIES).toContain('United Arab Emirates');
  });

  it('contains no duplicate country names', () => {
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });
});
