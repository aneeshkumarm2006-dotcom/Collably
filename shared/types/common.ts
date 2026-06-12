/**
 * Shared building-block types used across multiple models.
 *
 * Convention for these shared types: they describe the **API/JSON shape** that
 * both the backend returns and the mobile app consumes. IDs are strings
 * (Mongo ObjectId serialized) and dates are ISO-8601 strings. The backend's
 * Mongoose schemas (Phase 3) are defined separately and map onto these.
 */

/** ISO-8601 timestamp string, e.g. "2026-06-12T10:30:00.000Z". */
export type ISODateString = string;

/** Mongo ObjectId serialized to a string. */
export type ID = string;

export interface GeoLocation {
  city?: string;
  state?: string;
  country?: string;
}

/** Fields present on every persisted document once returned by the API. */
export interface Timestamped {
  createdAt: ISODateString;
  updatedAt?: ISODateString;
}
