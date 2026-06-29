'use client';

import { MapPin, MapPinned } from 'lucide-react';

import type { MapsStatus } from '@/lib/maps/use-google-maps';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shared graceful-state chrome for every map surface (Phase 11). When Maps JS
 * isn't configured / fails to load / has nothing to plot, we show an informative
 * panel instead of a blank tile — mirroring the geocoding + Cloudinary
 * "graceful when unconfigured" pattern used across the build.
 */
export function MapStatePanel({
  status,
  empty,
  title,
  description,
  className,
}: {
  status: MapsStatus;
  /** True when maps loaded fine but there's nothing to plot. */
  empty?: boolean;
  title?: string;
  description?: string;
  className?: string;
}) {
  if (status === 'loading') {
    return <Skeleton className={cn('w-full rounded-xl', className)} />;
  }

  const copy =
    status === 'error'
      ? {
          heading: 'Map couldn’t load',
          body: 'There was a problem loading the map. The location details are still listed above.',
        }
      : status === 'unconfigured'
        ? {
            heading: title ?? 'Map view coming soon',
            body:
              description ??
              'The interactive map isn’t enabled in this environment. Locations are still shown as text.',
          }
        : {
            heading: title ?? 'Nothing to map yet',
            body: description ?? 'No campaigns with a location to show on the map.',
          };

  void empty;

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hair-strong bg-secondary/60 p-8 text-center',
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-card text-brand shadow-xs">
        {status === 'unconfigured' ? <MapPinned className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{copy.heading}</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">{copy.body}</p>
      </div>
    </div>
  );
}
