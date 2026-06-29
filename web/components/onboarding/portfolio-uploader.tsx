'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, Plus, X } from 'lucide-react';

import type { PortfolioItem } from '@/lib/shared';
import { uploadToCloudinary } from '@/lib/upload/cloudinary';
import { looksLikeUrl, normalizeUrl } from '@/lib/onboarding/creator';
import { errorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Portfolio picker for creator onboarding (Phase 5). Up to `max` images, added
 * either by uploading a file (→ Cloudinary `secure_url`) or by pasting an image
 * URL — matching the design's image + "URL" slots. Each item stores just an
 * `imageUrl`. Portfolio is optional, so failures (e.g. Cloudinary unconfigured)
 * surface inline without blocking the step.
 */
export function PortfolioUploader({
  items,
  onChange,
  max = 6,
  disabled,
}: {
  items: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  const full = items.length >= max;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'portfolio');
      onChange([...items, { imageUrl: url }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    if (!looksLikeUrl(urlValue)) {
      setError('Enter a valid image URL.');
      return;
    }
    setError(null);
    onChange([...items, { imageUrl: normalizeUrl(urlValue) }]);
    setUrlValue('');
    setUrlOpen(false);
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <li
            key={`${item.imageUrl}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-md border border-hair"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied portfolio thumbnail */}
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(19,26,46,0.7)] text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Remove portfolio image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}

        {!full && (
          <>
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
                className={cn(
                  'flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-hair-strong bg-secondary text-faint transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Add photo</span>
                  </>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setUrlOpen((v) => !v);
                  setError(null);
                }}
                disabled={disabled}
                aria-expanded={urlOpen}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-hair-strong bg-secondary text-faint transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Link2 className="h-5 w-5" />
                <span className="text-[11px] font-medium">Add URL</span>
              </button>
            </li>
          </>
        )}
      </ul>

      {urlOpen && !full && (
        <div className="flex items-center gap-2">
          <Input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://images.example.com/your-work.jpg"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addUrl}>
            <Plus /> Add
          </Button>
        </div>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
