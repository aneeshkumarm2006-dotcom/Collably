/**
 * Cloudinary integration (PRD §8.1, §17). The mobile app never holds the
 * Cloudinary API secret. Instead it asks the backend for **signed upload
 * params**, then POSTs the (compressed) image straight to Cloudinary's upload
 * endpoint with those params attached. Only the signing happens here.
 *
 * Upload flow (client side, Phase 11):
 *   1. POST /api/upload/sign  → { cloudName, apiKey, timestamp, folder, signature }
 *   2. multipart POST to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`
 *      with fields: file, api_key, timestamp, folder, signature (+ any signed extras)
 *   3. Cloudinary returns `secure_url`, which the app stores on the profile/campaign.
 *
 * Signature spec: SHA-1 of the signed params sorted alphabetically and joined as
 * `k=v&k=v…`, with the API secret appended directly (no separator). `file`,
 * `cloud_name`, `resource_type`, and `api_key` are never signed.
 */
import crypto from 'node:crypto';
import { env } from '../lib/env';
import { AppError } from '../middleware/errorHandler';

/** Folders keep the Cloudinary media library tidy by upload context. */
export type UploadFolder = 'avatars' | 'logos' | 'campaigns' | 'portfolio' | 'submissions';

export interface SignUploadOptions {
  /** Sub-folder the asset lands in (PRD §8.1). Defaults to `misc`. */
  folder?: UploadFolder;
  /** Optional fixed public_id (e.g. to overwrite an existing avatar). */
  publicId?: string;
  /** Optional tags applied to the asset, stored as a comma-separated list. */
  tags?: string[];
}

/** Everything the client needs to perform a direct signed upload. */
export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Echoed back only when supplied, so the client sends the same signed value. */
  publicId?: string;
  tags?: string;
  /** Full upload endpoint, pre-built so the client doesn't reassemble it. */
  uploadUrl: string;
}

/** True when all three Cloudinary credentials are configured. */
export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Compute a Cloudinary upload signature over `params`. Exported for testing.
 * Keys are sorted alphabetically; values are joined `k=v` with `&`; the API
 * secret is appended, then SHA-1 hex.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}

/** Current UNIX time in **seconds** — Cloudinary signatures use second precision. */
function unixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build signed upload params for the client. Throws a 500 `AppError` if
 * Cloudinary isn't configured, so the route surfaces a clean error instead of
 * handing the app an unusable signature.
 */
export function createSignedUpload(options: SignUploadOptions = {}): SignedUploadParams {
  if (!isCloudinaryConfigured()) {
    throw new AppError(500, 'Image uploads are unavailable: Cloudinary is not configured');
  }

  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  const timestamp = unixSeconds();
  const folder = options.folder ?? 'misc';

  // Only these params are signed (and must be re-sent by the client verbatim).
  const signed: Record<string, string | number> = { folder, timestamp };
  if (options.publicId) signed.public_id = options.publicId;
  const tags = options.tags?.length ? options.tags.join(',') : undefined;
  if (tags) signed.tags = tags;

  const signature = signParams(signed, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
    ...(options.publicId ? { publicId: options.publicId } : {}),
    ...(tags ? { tags } : {}),
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}
