'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';

import {
  assertValidImage,
  InvalidImageError,
  resizeImageFile,
  uploadToCloudinary,
} from '@/lib/upload/cloudinary';
import { errorMessage } from '@/lib/api/errors';
import type { UploadFolder } from '@/lib/constants';
import { cn } from '@/lib/utils';

type PickedFile = { file: File; url: string };

/**
 * ImageUploadZone — drag-and-drop + click-to-pick image zone with live previews.
 *
 * Two modes:
 *  - **Preview only** (default): surfaces the chosen `File`s via `onChange` for a
 *    parent to upload later (the Phase 1 shell behavior).
 *  - **Auto-upload** (Phase 11): pass an `uploadFolder` and the zone signs +
 *    uploads each picked file straight to Cloudinary (downscaling large images
 *    client-side first), then reports the resulting `secure_url`s via `onUploaded`.
 *    `value` holds the already-uploaded URLs the parent stores.
 */
export interface ImageUploadZoneProps {
  /** Already-uploaded image URLs (shown as previews). */
  value?: string[];
  /** Fires with the currently picked `File`s (preview-only mode). */
  onChange?: (files: File[]) => void;
  /** Cloudinary folder — when set, picked files upload immediately to Cloudinary. */
  uploadFolder?: UploadFolder;
  /** Auto-upload mode: fires with the newly uploaded `secure_url`s. */
  onUploaded?: (urls: string[]) => void;
  /** Downscale large images before upload (auto-upload mode). Default: true. */
  resize?: boolean;
  /** Remove an already-uploaded image (by index) — shows an X when provided. */
  onRemoveExisting?: (index: number) => void;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageUploadZone({
  value,
  onChange,
  uploadFolder,
  onUploaded,
  resize = true,
  onRemoveExisting,
  multiple = false,
  maxFiles = 6,
  accept = 'image/*',
  label = 'Drag & drop or click to upload',
  hint = 'PNG, JPG, or WEBP — up to 10MB each',
  disabled,
  className,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const autoUpload = Boolean(uploadFolder);

  // Revoke object URLs on unmount (preview mode only).
  const pickedRef = useRef<PickedFile[]>([]);
  pickedRef.current = picked;
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const existing = value ?? [];
  const total = existing.length + (autoUpload ? uploadingCount : picked.length);

  /** Auto-upload mode: validate → resize → upload each picked file to Cloudinary. */
  async function uploadFiles(files: File[]) {
    if (!uploadFolder) return;
    setError(null);
    setUploadingCount((n) => n + files.length);
    const urls: string[] = [];
    try {
      for (const file of files) {
        try {
          assertValidImage(file);
        } catch (err) {
          if (err instanceof InvalidImageError) {
            setError(err.message);
            continue;
          }
          throw err;
        }
        const prepared = resize ? await resizeImageFile(file) : file;
        urls.push(await uploadToCloudinary(prepared, uploadFolder));
      }
      if (urls.length) onUploaded?.(urls);
    } catch (err) {
      setError(errorMessage(err, 'Could not upload that image.'));
    } finally {
      setUploadingCount((n) => Math.max(0, n - files.length));
    }
  }

  function addFiles(list: FileList | null) {
    if (!list || disabled) return;
    let incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!multiple) incoming = incoming.slice(0, 1);
    const room = Math.max(0, maxFiles - total);
    incoming = incoming.slice(0, room);
    if (!incoming.length) return;

    if (autoUpload) {
      void uploadFiles(incoming);
      return;
    }

    const made = incoming.map((file) => ({ file, url: URL.createObjectURL(file) }));
    let next: PickedFile[];
    if (multiple) {
      next = [...picked, ...made];
    } else {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      next = made;
    }
    setPicked(next);
    onChange?.(next.map((n) => n.file));
  }

  function removePicked(index: number) {
    const target = picked[index];
    if (target) URL.revokeObjectURL(target.url);
    const next = picked.filter((_, i) => i !== index);
    setPicked(next);
    onChange?.(next.map((n) => n.file));
  }

  const reachedMax = total >= maxFiles;
  const busy = uploadingCount > 0;

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        disabled={disabled || reachedMax || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex w-full flex-col items-center rounded-lg border-2 border-dashed bg-secondary px-6 py-8 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-hair-strong hover:border-brand',
          (disabled || reachedMax || busy) && 'cursor-not-allowed opacity-60 hover:border-hair-strong',
        )}
      >
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-card text-brand shadow-xs">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        </span>
        <span className="text-sm font-semibold text-ink">
          {busy ? 'Uploading…' : reachedMax ? 'Maximum reached' : label}
        </span>
        <span className="mt-0.5 text-xs text-faint">
          {reachedMax ? `Up to ${maxFiles} ${maxFiles === 1 ? 'image' : 'images'}` : hint}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </button>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {total > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {existing.map((src, i) => (
            <li key={`existing-${i}`} className="group relative aspect-square overflow-hidden rounded-md border border-hair">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview thumbnail */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(i)}
                  className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(19,26,46,0.7)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {/* Auto-upload: spinner tiles for in-flight uploads. */}
          {autoUpload
            ? Array.from({ length: uploadingCount }).map((_, i) => (
                <li
                  key={`uploading-${i}`}
                  className="flex aspect-square items-center justify-center rounded-md border border-hair bg-secondary text-faint"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </li>
              ))
            : picked.map((p, i) => (
                <li key={`picked-${i}`} className="group relative aspect-square overflow-hidden rounded-md border border-hair">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePicked(i)}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(19,26,46,0.7)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          {multiple && !reachedMax && !busy && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed border-hair-strong text-faint transition-colors hover:border-brand hover:text-brand"
                aria-label="Add more images"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
