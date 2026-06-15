/**
 * Direct-to-Cloudinary image upload (PRD §8.1).
 *
 * Flow (the API secret never reaches the device):
 *   1. Ask our backend for signed upload params — `POST /api/upload/sign`.
 *   2. Multipart-POST the local image straight to Cloudinary with those params.
 *   3. Return the resulting `secure_url` to store on a profile/campaign/submission.
 *
 * Pair this with `expo-image-manipulator` compression (Phase 16) before calling,
 * so we never upload more than ~1MB.
 */
import { Platform } from 'react-native';
import { api } from './api';

/** Folders the backend's sign route accepts (must match its zod enum). */
export type UploadFolder = 'avatars' | 'logos' | 'campaigns' | 'portfolio' | 'submissions';

/** Signed params returned by `POST /api/upload/sign`. */
type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

/** A local image to upload — typically `result.assets[0]` from expo-image-picker. */
export type LocalImage = {
  uri: string;
  /** MIME type, e.g. "image/jpeg". Defaults to jpeg when the picker omits it. */
  mimeType?: string | null;
  fileName?: string | null;
};

/**
 * Upload a local image to Cloudinary and return its hosted `secure_url`.
 * Throws (via the axios `ApiError`) if signing or the upload fails.
 */
export async function uploadImage(image: LocalImage, folder: UploadFolder): Promise<string> {
  // 1. Get signed params from our backend.
  const { data: signed } = await api.post<SignedUpload>('/upload/sign', { folder });

  // 2. Build the multipart body Cloudinary expects.
  const form = new FormData();
  const mime = image.mimeType ?? 'image/jpeg';
  const name = image.fileName ?? `upload.${mime.split('/')[1] ?? 'jpg'}`;
  if (Platform.OS === 'web') {
    // Browsers' native FormData stringifies a plain object to "[object Object]"
    // (Cloudinary then rejects it as "Unsupported source URL"). Fetch the local
    // uri (blob:/data:/http:) into a real Blob and append that instead.
    const blob = await (await fetch(image.uri)).blob();
    form.append('file', blob, name);
  } else {
    // React Native's FormData accepts this {uri,name,type} shape for file parts.
    form.append('file', { uri: image.uri, name, type: mime } as unknown as Blob);
  }
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('folder', signed.folder);
  form.append('signature', signed.signature);

  // 3. Upload directly to Cloudinary (not through our backend / axios instance).
  const res = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Cloudinary did not return a secure_url');
  return json.secure_url;
}
