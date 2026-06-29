/**
 * Location data for the onboarding / campaign location pickers (PRD §7.2).
 * Ported verbatim from `mobile/lib/locations.ts` so the website and the app
 * offer the same Canada-first, globally-aware suggestions.
 *
 * Canada-first but global: a curated list of major Canadian cities (each tagged
 * with its province/territory + country), all provinces/territories of Canada
 * plus common international regions, and a broad country list. Picking a city
 * auto-fills its region and country. Kept lightweight so it bundles cheaply.
 *
 * The autocomplete always allows free text, so anything not listed can still be
 * typed — the lists are suggestions, not a closed set.
 */

export type CityRecord = { city: string; state: string; country: string };

// ── Cities (city → region + country) ─────────────────────────────────────────
const CANADA_CITIES: CityRecord[] = [
  { city: 'Toronto', state: 'Ontario', country: 'Canada' },
  { city: 'Ottawa', state: 'Ontario', country: 'Canada' },
  { city: 'Mississauga', state: 'Ontario', country: 'Canada' },
  { city: 'Brampton', state: 'Ontario', country: 'Canada' },
  { city: 'Hamilton', state: 'Ontario', country: 'Canada' },
  { city: 'London', state: 'Ontario', country: 'Canada' },
  { city: 'Markham', state: 'Ontario', country: 'Canada' },
  { city: 'Vaughan', state: 'Ontario', country: 'Canada' },
  { city: 'Kitchener', state: 'Ontario', country: 'Canada' },
  { city: 'Windsor', state: 'Ontario', country: 'Canada' },
  { city: 'Montreal', state: 'Quebec', country: 'Canada' },
  { city: 'Quebec City', state: 'Quebec', country: 'Canada' },
  { city: 'Laval', state: 'Quebec', country: 'Canada' },
  { city: 'Gatineau', state: 'Quebec', country: 'Canada' },
  { city: 'Longueuil', state: 'Quebec', country: 'Canada' },
  { city: 'Sherbrooke', state: 'Quebec', country: 'Canada' },
  { city: 'Vancouver', state: 'British Columbia', country: 'Canada' },
  { city: 'Surrey', state: 'British Columbia', country: 'Canada' },
  { city: 'Burnaby', state: 'British Columbia', country: 'Canada' },
  { city: 'Richmond', state: 'British Columbia', country: 'Canada' },
  { city: 'Victoria', state: 'British Columbia', country: 'Canada' },
  { city: 'Kelowna', state: 'British Columbia', country: 'Canada' },
  { city: 'Calgary', state: 'Alberta', country: 'Canada' },
  { city: 'Edmonton', state: 'Alberta', country: 'Canada' },
  { city: 'Red Deer', state: 'Alberta', country: 'Canada' },
  { city: 'Lethbridge', state: 'Alberta', country: 'Canada' },
  { city: 'Winnipeg', state: 'Manitoba', country: 'Canada' },
  { city: 'Brandon', state: 'Manitoba', country: 'Canada' },
  { city: 'Saskatoon', state: 'Saskatchewan', country: 'Canada' },
  { city: 'Regina', state: 'Saskatchewan', country: 'Canada' },
  { city: 'Halifax', state: 'Nova Scotia', country: 'Canada' },
  { city: 'Moncton', state: 'New Brunswick', country: 'Canada' },
  { city: 'Saint John', state: 'New Brunswick', country: 'Canada' },
  { city: 'Fredericton', state: 'New Brunswick', country: 'Canada' },
  { city: "St. John's", state: 'Newfoundland and Labrador', country: 'Canada' },
  { city: 'Charlottetown', state: 'Prince Edward Island', country: 'Canada' },
  { city: 'Whitehorse', state: 'Yukon', country: 'Canada' },
  { city: 'Yellowknife', state: 'Northwest Territories', country: 'Canada' },
  { city: 'Iqaluit', state: 'Nunavut', country: 'Canada' },
];

const INTERNATIONAL_CITIES: CityRecord[] = [
  // United States
  { city: 'New York', state: 'New York', country: 'United States' },
  { city: 'Los Angeles', state: 'California', country: 'United States' },
  { city: 'San Francisco', state: 'California', country: 'United States' },
  { city: 'San Diego', state: 'California', country: 'United States' },
  { city: 'Chicago', state: 'Illinois', country: 'United States' },
  { city: 'Houston', state: 'Texas', country: 'United States' },
  { city: 'Austin', state: 'Texas', country: 'United States' },
  { city: 'Dallas', state: 'Texas', country: 'United States' },
  { city: 'Seattle', state: 'Washington', country: 'United States' },
  { city: 'Miami', state: 'Florida', country: 'United States' },
  { city: 'Boston', state: 'Massachusetts', country: 'United States' },
  { city: 'Atlanta', state: 'Georgia', country: 'United States' },
  // United Kingdom
  { city: 'London', state: 'England', country: 'United Kingdom' },
  { city: 'Manchester', state: 'England', country: 'United Kingdom' },
  { city: 'Birmingham', state: 'England', country: 'United Kingdom' },
  { city: 'Edinburgh', state: 'Scotland', country: 'United Kingdom' },
  { city: 'Glasgow', state: 'Scotland', country: 'United Kingdom' },
  // UAE & Gulf
  { city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates' },
  { city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates' },
  { city: 'Sharjah', state: 'Sharjah', country: 'United Arab Emirates' },
  { city: 'Doha', state: 'Doha', country: 'Qatar' },
  { city: 'Riyadh', state: 'Riyadh Province', country: 'Saudi Arabia' },
  { city: 'Jeddah', state: 'Makkah Province', country: 'Saudi Arabia' },
  // Asia-Pacific
  { city: 'Singapore', state: 'Singapore', country: 'Singapore' },
  { city: 'Hong Kong', state: 'Hong Kong', country: 'Hong Kong' },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan' },
  { city: 'Osaka', state: 'Osaka', country: 'Japan' },
  { city: 'Seoul', state: 'Seoul', country: 'South Korea' },
  { city: 'Bangkok', state: 'Bangkok', country: 'Thailand' },
  { city: 'Kuala Lumpur', state: 'Kuala Lumpur', country: 'Malaysia' },
  { city: 'Jakarta', state: 'Jakarta', country: 'Indonesia' },
  { city: 'Sydney', state: 'New South Wales', country: 'Australia' },
  { city: 'Melbourne', state: 'Victoria', country: 'Australia' },
  { city: 'Brisbane', state: 'Queensland', country: 'Australia' },
  { city: 'Auckland', state: 'Auckland', country: 'New Zealand' },
  // Europe
  { city: 'Paris', state: 'Île-de-France', country: 'France' },
  { city: 'Berlin', state: 'Berlin', country: 'Germany' },
  { city: 'Munich', state: 'Bavaria', country: 'Germany' },
  { city: 'Amsterdam', state: 'North Holland', country: 'Netherlands' },
  { city: 'Madrid', state: 'Community of Madrid', country: 'Spain' },
  { city: 'Barcelona', state: 'Catalonia', country: 'Spain' },
  { city: 'Rome', state: 'Lazio', country: 'Italy' },
  { city: 'Milan', state: 'Lombardy', country: 'Italy' },
  { city: 'Lisbon', state: 'Lisbon', country: 'Portugal' },
  { city: 'Dublin', state: 'Leinster', country: 'Ireland' },
  { city: 'Zurich', state: 'Zurich', country: 'Switzerland' },
  { city: 'Stockholm', state: 'Stockholm', country: 'Sweden' },
];

/** All cities (Canada first, then international). */
export const CITIES: CityRecord[] = [...CANADA_CITIES, ...INTERNATIONAL_CITIES];

/** City names for the type-ahead options. */
export const CITY_NAMES: string[] = CITIES.map((c) => c.city);

/** Look up a city's region + country (case-insensitive, first match wins). */
export function locationForCity(city: string): { state: string; country: string } | undefined {
  const q = city.trim().toLowerCase();
  const hit = CITIES.find((c) => c.city.toLowerCase() === q);
  return hit ? { state: hit.state, country: hit.country } : undefined;
}

// ── Regions / provinces (suggestions across the supported countries) ──────────
const CANADIAN_PROVINCES_LIST = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
];

/** Combined region/province suggestions: Canada + the international regions in CITIES. */
export const REGIONS: string[] = Array.from(
  new Set([...CANADIAN_PROVINCES_LIST, ...INTERNATIONAL_CITIES.map((c) => c.state)]),
).sort();

/** Just Canada's provinces/territories (kept for Canada-specific callers). */
export const CANADIAN_PROVINCES = CANADIAN_PROVINCES_LIST;

// ── Countries ─────────────────────────────────────────────────────────────────
export const COUNTRIES: string[] = [
  'Canada',
  'United States',
  'United Kingdom',
  'Australia',
  'New Zealand',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Singapore',
  'Hong Kong',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Japan',
  'South Korea',
  'France',
  'Germany',
  'Netherlands',
  'Spain',
  'Italy',
  'Portugal',
  'Ireland',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Belgium',
  'Austria',
  'Poland',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Egypt',
  'Brazil',
  'Mexico',
  'Argentina',
];
