/**
 * Direct-to-Cloudinary image upload for the browser (PRD §8.1). Mirrors the
 * mobile flow in `mobile/lib/cloudinary.ts`, adapted to the web's same-origin
 * transport:
 *
 *   1. Ask our backend for signed params via `clientApi.upload.sign({ folder })`
 *      (this goes through the same-origin proxy, which attaches the httpOnly
 *      access cookie server-side, so the Cloudinary API secret never reaches JS).
 *   2. Multipart-POST the `File` straight to Cloudinary with those params.
 *   3. Return the resulting `secure_url` to store on the profile.
 *
 * Onboarding (Phase 5) uses this for the creator portfolio + business logo; the
 * Phase 11 `ImageUploadZone` wiring builds on the same helper. Throws an
 * `ApiError` if signing fails (e.g. Cloudinary unconfigured) and an `Error` if
 * the Cloudinary upload itself fails; callers surface these inline.
 */
import { clientApi } from '@/lib/api/client';
import type { UploadFolder } from '@/lib/constants';

/** Largest file we accept before the backend/Cloudinary would reject it (PRD §8.5). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** Thrown when a picked file is the wrong type or too large, so callers can show a friendly message. */
export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImageError';
  }
}

/** Validate a picked file is an image within the size budget. Throws `InvalidImageError`. */
export function assertValidImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new InvalidImageError('That file isn’t an image. Pick a PNG, JPG, or WEBP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new InvalidImageError('That image is over 10MB. Pick a smaller one.');
  }
}

/**
 * Downscale a large image client-side before upload (PRD §8, "crop/resize
 * client-side"). Re-encodes via a canvas so we never push a 12-megapixel phone
 * photo over the wire when a ~1600px longest-edge copy is plenty for cards and
 * detail pages. Best-effort: animated GIFs, SVGs, decode failures, or a
 * non-browser context all return the original file untouched.
 */
export async function resizeImageFile(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  if (typeof document === 'undefined') return file;
  // GIF (possibly animated) and SVG don't survive a canvas round-trip, so leave them.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= maxEdge) {
      bitmap.close?.();
      return file;
    }

    const scale = maxEdge / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    // Keep PNGs lossless; everything else re-encodes as JPEG for a smaller file.
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === 'image/png' ? 'png' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    return new File([blob], name, { type: outType, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/**
 * Upload a `File` to Cloudinary and return its hosted `secure_url`. Validates the
 * file first (type + size).
 */
export async function uploadToCloudinary(file: File, folder: UploadFolder): Promise<string> {
  assertValidImage(file);

  // 1. Signed params from our backend (cookie attached by the proxy).
  const signed = await clientApi.upload.sign({ folder });

  // Cloudinary's upload endpoint: prefer a server-provided URL, else derive it.
  const uploadUrl =
    (typeof signed.uploadUrl === 'string' && signed.uploadUrl) ||
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`;

  // 2. Build the multipart body Cloudinary expects (only the signed fields).
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  if (signed.folder) form.append('folder', String(signed.folder));
  if (signed.publicId) form.append('public_id', String(signed.publicId));
  form.append('signature', signed.signature);

  // 3. Upload directly to Cloudinary (not through our proxy / backend).
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Cloudinary did not return an image URL.');
  return json.secure_url;
}
