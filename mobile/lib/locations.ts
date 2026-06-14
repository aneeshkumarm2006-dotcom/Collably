/**
 * Location data for the onboarding / campaign location pickers (PRD §7.2).
 *
 * India-first but global: a curated list of major cities worldwide (each tagged
 * with its state/region + country), all states/UTs of India plus common
 * international regions, and a broad country list. Picking a city auto-fills its
 * region and country. Kept lightweight so it bundles cheaply.
 *
 * The autocomplete always allows free text, so anything not listed can still be
 * typed — the lists are suggestions, not a closed set.
 */

export type CityRecord = { city: string; state: string; country: string };

// ── Cities (city → region + country) ─────────────────────────────────────────
const INDIA_CITIES: CityRecord[] = [
  { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { city: 'Pune', state: 'Maharashtra', country: 'India' },
  { city: 'Nagpur', state: 'Maharashtra', country: 'India' },
  { city: 'Nashik', state: 'Maharashtra', country: 'India' },
  { city: 'Thane', state: 'Maharashtra', country: 'India' },
  { city: 'Delhi', state: 'Delhi', country: 'India' },
  { city: 'New Delhi', state: 'Delhi', country: 'India' },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  { city: 'Mysuru', state: 'Karnataka', country: 'India' },
  { city: 'Mangaluru', state: 'Karnataka', country: 'India' },
  { city: 'Hubballi', state: 'Karnataka', country: 'India' },
  { city: 'Hyderabad', state: 'Telangana', country: 'India' },
  { city: 'Warangal', state: 'Telangana', country: 'India' },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India' },
  { city: 'Madurai', state: 'Tamil Nadu', country: 'India' },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India' },
  { city: 'Kolkata', state: 'West Bengal', country: 'India' },
  { city: 'Howrah', state: 'West Bengal', country: 'India' },
  { city: 'Siliguri', state: 'West Bengal', country: 'India' },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  { city: 'Surat', state: 'Gujarat', country: 'India' },
  { city: 'Vadodara', state: 'Gujarat', country: 'India' },
  { city: 'Rajkot', state: 'Gujarat', country: 'India' },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { city: 'Jodhpur', state: 'Rajasthan', country: 'India' },
  { city: 'Udaipur', state: 'Rajasthan', country: 'India' },
  { city: 'Kota', state: 'Rajasthan', country: 'India' },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Noida', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Agra', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Prayagraj', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Gurugram', state: 'Haryana', country: 'India' },
  { city: 'Faridabad', state: 'Haryana', country: 'India' },
  { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Indore', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Gwalior', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Jabalpur', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Patna', state: 'Bihar', country: 'India' },
  { city: 'Gaya', state: 'Bihar', country: 'India' },
  { city: 'Kochi', state: 'Kerala', country: 'India' },
  { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India' },
  { city: 'Kozhikode', state: 'Kerala', country: 'India' },
  { city: 'Thrissur', state: 'Kerala', country: 'India' },
  { city: 'Bhubaneswar', state: 'Odisha', country: 'India' },
  { city: 'Cuttack', state: 'Odisha', country: 'India' },
  { city: 'Guwahati', state: 'Assam', country: 'India' },
  { city: 'Ranchi', state: 'Jharkhand', country: 'India' },
  { city: 'Jamshedpur', state: 'Jharkhand', country: 'India' },
  { city: 'Raipur', state: 'Chhattisgarh', country: 'India' },
  { city: 'Dehradun', state: 'Uttarakhand', country: 'India' },
  { city: 'Amritsar', state: 'Punjab', country: 'India' },
  { city: 'Ludhiana', state: 'Punjab', country: 'India' },
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India' },
  { city: 'Panaji', state: 'Goa', country: 'India' },
  { city: 'Shimla', state: 'Himachal Pradesh', country: 'India' },
  { city: 'Srinagar', state: 'Jammu and Kashmir', country: 'India' },
  { city: 'Jammu', state: 'Jammu and Kashmir', country: 'India' },
  { city: 'Puducherry', state: 'Puducherry', country: 'India' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India' },
  { city: 'Tirupati', state: 'Andhra Pradesh', country: 'India' },
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
  // Canada
  { city: 'Toronto', state: 'Ontario', country: 'Canada' },
  { city: 'Vancouver', state: 'British Columbia', country: 'Canada' },
  { city: 'Montreal', state: 'Quebec', country: 'Canada' },
  { city: 'Calgary', state: 'Alberta', country: 'Canada' },
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
  { city: 'Colombo', state: 'Western Province', country: 'Sri Lanka' },
  { city: 'Kathmandu', state: 'Bagmati', country: 'Nepal' },
  { city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh' },
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

/** All cities (India first, then international). */
export const CITIES: CityRecord[] = [...INDIA_CITIES, ...INTERNATIONAL_CITIES];

/** City names for the type-ahead options. */
export const CITY_NAMES: string[] = CITIES.map((c) => c.city);

/** Look up a city's region + country (case-insensitive, first match wins). */
export function locationForCity(city: string): { state: string; country: string } | undefined {
  const q = city.trim().toLowerCase();
  const hit = CITIES.find((c) => c.city.toLowerCase() === q);
  return hit ? { state: hit.state, country: hit.country } : undefined;
}

// ── Regions / states (suggestions across the supported countries) ─────────────
const INDIAN_STATES_LIST = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/** Combined region/state suggestions: India + the international regions in CITIES. */
export const REGIONS: string[] = Array.from(
  new Set([...INDIAN_STATES_LIST, ...INTERNATIONAL_CITIES.map((c) => c.state)]),
).sort();

/** Just India's states/UTs (kept for India-specific callers). */
export const INDIAN_STATES = INDIAN_STATES_LIST;

// ── Countries ─────────────────────────────────────────────────────────────────
export const COUNTRIES: string[] = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
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
  'Sri Lanka',
  'Nepal',
  'Bangladesh',
  'Pakistan',
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
