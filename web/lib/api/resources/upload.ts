/**
 * Upload endpoint (PRD §8.1): signed direct-to-Cloudinary params. The browser
 * requests params, then uploads the file straight to Cloudinary (Phase 11). Maps
 * 1:1 to `backend/src/routes/upload.ts`.
 */
import type { HttpClient } from '../types';
import type { UploadSignature, UploadSignInput } from '../types';

export function createUploadApi(http: HttpClient) {
  return {
    /** POST /upload/sign: signed params for a direct-to-Cloudinary upload. */
    sign: (input?: UploadSignInput) => http.post<UploadSignature>('/upload/sign', input ?? {}),
  };
}

export type UploadApi = ReturnType<typeof createUploadApi>;
