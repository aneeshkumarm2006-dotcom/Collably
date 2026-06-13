/**
 * Pick → compress → upload, in one call (PRD §7.2, §8.1, §8.5).
 *
 * Used by onboarding (logo / portfolio) and later by profile edit + submissions.
 * The flow:
 *   1. Ask for media-library permission, then open the system picker.
 *   2. Compress the chosen image with `expo-image-manipulator` — downscale the
 *      longest side and step the JPEG quality down until it fits under ~1MB
 *      (PRD §8.5), so we never push a multi-MB phone photo to Cloudinary.
 *   3. Hand the compressed local file to `uploadImage` (signed upload → Cloudinary)
 *      and return the hosted `secure_url`.
 *
 * Returns `null` when the user cancels the picker. Throws `ImagePermissionError`
 * if library access is denied, and propagates the `ApiError`/network error from
 * the upload — callers surface these in a form banner.
 */
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { uploadImage, type UploadFolder } from './cloudinary';

/** Thrown when the user denies photo-library access, so callers can prompt them to Settings. */
export class ImagePermissionError extends Error {
  constructor(message = 'Photo library access is needed to pick an image. Enable it in Settings.') {
    super(message);
    this.name = 'ImagePermissionError';
  }
}

export type PickAndUploadOptions = {
  /** Crop aspect ratio for the in-picker editor (e.g. [1, 1] for a logo/avatar). */
  aspect?: [number, number];
  /** Longest-edge cap in px after downscale. Default 1080. */
  maxDimension?: number;
  /** Soft byte budget the compressor aims to stay under. Default ~1MB. */
  targetBytes?: number;
};

const DEFAULT_MAX_DIMENSION = 1080;
const DEFAULT_TARGET_BYTES = 1_000_000;

/** Best-effort byte size of a local file via its blob. Returns null if unknown. */
async function fileSize(uri: string): Promise<number | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size || null;
  } catch {
    return null;
  }
}

/**
 * Compress a local image to JPEG, downscaling the longest side to `maxDimension`
 * and stepping quality down until it fits under `targetBytes` (best-effort, capped
 * iterations so a stubborn image still resolves). Returns the new local uri.
 */
async function compressImage(
  uri: string,
  width: number,
  maxDimension: number,
  targetBytes: number,
): Promise<string> {
  // Only resize when the image is larger than the cap (avoid upscaling small picks).
  const resize = width > maxDimension ? [{ resize: { width: maxDimension } }] : [];

  let quality = 0.8;
  let result = await manipulateAsync(uri, resize, { compress: quality, format: SaveFormat.JPEG });

  // Step the quality down a few times if we're still over budget.
  for (let i = 0; i < 3; i += 1) {
    const size = await fileSize(result.uri);
    if (size === null || size <= targetBytes) break;
    quality -= 0.2;
    if (quality < 0.3) break;
    result = await manipulateAsync(uri, resize, { compress: quality, format: SaveFormat.JPEG });
  }

  return result.uri;
}

/**
 * Open the photo library, let the user pick + crop one image, compress it under
 * ~1MB, and upload it to Cloudinary. Returns the hosted URL, or `null` if cancelled.
 */
export async function pickAndUploadImage(
  folder: UploadFolder,
  opts: PickAndUploadOptions = {},
): Promise<string | null> {
  const { aspect, maxDimension = DEFAULT_MAX_DIMENSION, targetBytes = DEFAULT_TARGET_BYTES } = opts;

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new ImagePermissionError();

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1, // we do our own compression below for a predictable size
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  const compressedUri = await compressImage(asset.uri, asset.width || maxDimension, maxDimension, targetBytes);

  return uploadImage({ uri: compressedUri, mimeType: 'image/jpeg' }, folder);
}
