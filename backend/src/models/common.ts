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

/** A `{ lat, lng }` pair — mirrors `GeoPoint` in `shared/types/common.ts`. */
export const geoPointSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

/**
 * A GeoJSON Point (`[lng, lat]` order, per the spec) used purely to back a
 * `2dsphere` index for radius/"near me" queries. Derived from the campaign's
 * `coordinates` on save — never set by the client directly.
 */
export const geoJsonPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { _id: false },
);

/**
 * Campaign location (On-Site Location feature). The coarse `geoLocationSchema`
 * fields plus an exact pin (`coordinates` + `address` + `placeId`) and the
 * GeoJSON `geo` mirror for indexing. The privacy fuzzing for unauthorized
 * viewers happens in the serializer, never in the stored document.
 */
export const campaignLocationSchema = new Schema(
  {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    coordinates: { type: geoPointSchema, default: undefined },
    address: { type: String, trim: true },
    placeId: { type: String, trim: true },
    geo: { type: geoJsonPointSchema, default: undefined },
  },
  { _id: false },
);
