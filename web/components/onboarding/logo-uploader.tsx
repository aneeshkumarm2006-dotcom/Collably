'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';

import { uploadToCloudinary } from '@/lib/upload/cloudinary';
import { errorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';

/**
 * Circular logo picker for business onboarding (Phase 5). Uploads a single image
 * to Cloudinary (`logos` folder) and stores its `secure_url`. The logo is
 * optional/skippable, so an upload failure surfaces inline without blocking.
 */
export function LogoUploader({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'logos');
      onChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex h-[160px] w-[160px] flex-col items-center justify-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-hair-strong bg-secondary text-faint transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={value ? 'Replace logo' : 'Upload logo'}
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied logo preview
          <img src={value} alt="Business logo preview" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7" />
            <span className="text-[13px] font-medium">Upload logo</span>
            <span className="text-[11px]">PNG or JPG</span>
          </>
        )}
      </button>

      {value && !uploading && (
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <RefreshCw /> Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 /> Remove
          </Button>
        </div>
      )}

      <p className="mt-4 text-center text-[13px] text-faint">
        Recommended: square, at least 400×400px.
      </p>
      {error && <p className="mt-2 text-center text-[13px] text-danger">{error}</p>}

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
