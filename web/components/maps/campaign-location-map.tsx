'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Lock, MapPin } from 'lucide-react';

import type { CampaignLocation } from '@/lib/shared';
import { useGoogleMaps } from '@/lib/maps/use-google-maps';
import { cn } from '@/lib/utils';
import { MapStatePanel } from './map-frame';

/**
 * Campaign-detail location map (Phase 11), honoring the On-Site Location privacy
 * model (`backend/src/lib/serialize.ts`):
 *  - Authorized viewers (owner / admin / accepted creator) get a precise pin +
 *    street address (`locationPrecise`).
 *  - Everyone else gets the server-fuzzed approximate center + a radius circle;
 *    the exact coordinates never reach the client.
 * The page omits this entirely for remote campaigns. Degrades to a text-only
 * card when Maps JS is unconfigured.
 */
export function CampaignLocationMap({
  location,
  className,
}: {
  location: CampaignLocation;
  className?: string;
}) {
  const { status, maps } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const precise = Boolean(location.locationPrecise && location.coordinates);
  const center = location.coordinates ?? location.approxCoordinates ?? null;
  const radius = location.radiusMeters ?? 750;

  const cityLine = useMemo(
    () => [location.city, location.state, location.country].filter(Boolean).join(', '),
    [location.city, location.state, location.country],
  );

  useEffect(() => {
    if (status !== 'ready' || !maps || !containerRef.current || mapRef.current || !center) return;
    const map = new maps.Map(containerRef.current, {
      center,
      zoom: precise ? 15 : 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'cooperative',
      backgroundColor: '#e9eef5',
    });
    mapRef.current = map;

    if (precise) {
      new maps.Marker({ position: center, map, title: location.address ?? cityLine });
    } else {
      const circle = new maps.Circle({
        center,
        radius,
        map,
        strokeColor: '#1877F2',
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        fillColor: '#1877F2',
        fillOpacity: 0.14,
        clickable: false,
      });
      const bounds = circle.getBounds();
      if (bounds) map.fitBounds(bounds, 24);
    }

    return () => {
      if (mapRef.current && maps) maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, [status, maps, center, precise, radius, location.address, cityLine]);

  // No pin at all (coarse city only) → just the text line.
  if (!center) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted', className)}>
        <MapPin className="h-4 w-4 text-brand" />
        {cityLine || 'On-site'}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="font-medium text-ink">{precise ? location.address || cityLine : cityLine}</p>
          {!precise && (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
              <Lock className="h-3 w-3" />
              Approximate area shown. The exact address is shared once you’re accepted.
            </p>
          )}
        </div>
      </div>

      {status !== 'ready' ? (
        <MapStatePanel
          status={status}
          className={cn('min-h-[240px]', className)}
          title="Map view coming soon"
          description="The interactive map isn’t enabled here. The location is listed above."
        />
      ) : (
        <div
          ref={containerRef}
          className="min-h-[240px] w-full overflow-hidden rounded-xl border border-hair"
          role="application"
          aria-label="Map showing the campaign location"
        />
      )}
    </div>
  );
}
