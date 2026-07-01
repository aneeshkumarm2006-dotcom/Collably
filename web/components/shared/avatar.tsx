import {
  Avatar as AvatarRoot,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

/**
 * Avatar: image with an initials fallback (brand bg, white mono initials),
 * built on the shadcn/Radix avatar primitive. `size` is px; `shape` toggles a
 * circle (default) or a rounded square (the reference `.avatar-sq`).
 */
export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  shape?: 'circle' | 'square';
  className?: string;
}

export function Avatar({ name, src, size = 40, shape = 'circle', className }: AvatarProps) {
  const radius = shape === 'square' ? 'rounded-md' : 'rounded-full';
  return (
    <AvatarRoot
      className={cn(radius, className)}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {src ? <AvatarImage src={src} alt={name} className={radius} /> : null}
      <AvatarFallback
        className={cn(radius, 'leading-none')}
        style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        delayMs={src ? 300 : 0}
      >
        {initials(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}
