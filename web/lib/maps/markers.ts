/**
 * SVG marker-icon builders for the explore map (Phase 11). Returns data-URI
 * `<img>` descriptors for classic `google.maps.Marker` icons so we get the app's
 * brand colors without a marker dependency:
 *  - `valuePinIcon` — a green ($money) value pill on a teardrop pin.
 *  - `clusterIcon`  — a brand-blue count bubble for collapsed groups.
 *
 * Colors are hard-coded hex (matching the design tokens: money `#31A24C`, brand
 * `#1877F2`) because the SVG is rasterized by the browser outside the Tailwind/CSS
 * scope. The component turns `{ url, width, height }` into a real `Icon` (it needs
 * the live `google.maps.Size`/`Point` constructors).
 */

export interface MarkerIcon {
  url: string;
  width: number;
  height: number;
}

const MONEY = '#31A24C';
const MONEY_DARK = '#1F7A38';
const BRAND = '#1877F2';
const BRAND_DARK = '#0E5FCB';

function encode(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Escape text for safe inclusion in SVG markup. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A value pill ("$180" / "Reward") sitting above a pin point. Width scales with
 * the label so longer rewards don't clip.
 */
export function valuePinIcon(label: string, active = false): MarkerIcon {
  const text = esc(label);
  const padX = 12;
  const charW = 7.6;
  const pillW = Math.max(44, Math.round(text.length * charW + padX * 2));
  const pillH = 28;
  const pointH = 9;
  const width = pillW;
  const height = pillH + pointH;
  const fill = active ? MONEY_DARK : MONEY;
  const cx = width / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <g>
      <rect x="1" y="1" rx="14" ry="14" width="${pillW - 2}" height="${pillH - 2}" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
      <path d="M ${cx - 7} ${pillH - 2} L ${cx} ${height - 1} L ${cx + 7} ${pillH - 2} Z" fill="${fill}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      <text x="${cx}" y="${pillH / 2 + 4.5}" text-anchor="middle" font-family="-apple-system, Segoe UI, system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${text}</text>
    </g>
  </svg>`;

  return { url: encode(svg), width, height };
}

/** A circular count bubble for a collapsed cluster of pins. */
export function clusterIcon(count: number): MarkerIcon {
  const label = count > 99 ? '99+' : String(count);
  // Grow the bubble a little with the count so 3-digit labels still fit.
  const size = label.length >= 3 ? 52 : label.length === 2 ? 46 : 42;
  const r = size / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${r}" cy="${r}" r="${r - 5}" fill="${BRAND}" fill-opacity="0.22"/>
    <circle cx="${r}" cy="${r}" r="${r - 9}" fill="${BRAND}" stroke="#ffffff" stroke-width="2"/>
    <text x="${r}" y="${r + 4.5}" text-anchor="middle" font-family="-apple-system, Segoe UI, system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${label}</text>
  </svg>`;

  return { url: encode(svg), width: size, height: size };
}

export { BRAND, BRAND_DARK };
