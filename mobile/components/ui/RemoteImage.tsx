/**
 * Cached, progressively-loaded remote image (PRD §8.5).
 *
 * A thin wrapper over `expo-image` that sets sensible defaults for every remote
 * image in the app:
 *   - `cachePolicy="memory-disk"` so Cloudinary images are cached on disk and in
 *     memory (no re-download on scroll-back or re-mount);
 *   - a neutral blurhash `placeholder` for a blur-up progressive reveal instead of
 *     a blank rectangle while the bytes load;
 *   - a default cross-fade `transition`.
 *
 * Callers still pass `source`, `style`, `contentFit`, `onError`, and (for lists)
 * `recyclingKey`. Any prop here can be overridden per call.
 */
import { Image, type ImageProps } from 'expo-image';

/** Neutral low-res blurhash used as the blur-up placeholder for all remote images. */
export const BLURHASH = 'L6Rfkn00~q009F-;%MM{00of-;j[';

export function RemoteImage({ transition = 200, ...props }: ImageProps) {
  return (
    <Image
      cachePolicy="memory-disk"
      placeholder={{ blurhash: BLURHASH }}
      placeholderContentFit="cover"
      transition={transition}
      {...props}
    />
  );
}
