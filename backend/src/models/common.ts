import { Schema } from 'mongoose';

/**
 * Reusable embedded sub-schemas shared across models. Mirrors the
 * `GeoLocation` shape in `shared/types/common.ts` (PRD §5.2–§5.4).
 *
 * `_id: false` keeps these as plain embedded objects (no per-subdocument id),
 * which matches the JSON shape the mobile app expects.
 */
export const geoLocationSchema = new Schema(
  {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false },
);
