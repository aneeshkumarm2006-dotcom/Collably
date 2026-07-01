'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';

import { clientApi } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import type { LocationPin } from '@/lib/business/campaign-form';
import { useGoogleMaps } from '@/lib/maps/use-google-maps';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapStatePanel } from './map-frame';

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 56.13, lng: -106.35 };

/**
 * Exact-pin editor for the campaign form (Phase 11, On-Site Location feature).
 * Forward-geocodes a typed address via `/api/geocoding/search`, drops a draggable
 * pin, and reverse-geocodes drags via `/api/geocoding/reverse`, all through the
 * same-origin proxy so the Google key stays server-side. Fully graceful: when
 * geocoding/maps aren't configured (the default here) the business just keeps the
 * coarse city above; an existing pin (on edit) is preserved and shown as text.
 */
export function LocationPicker({
  value,
  onChange,
  cityHint,
}: {
  value: LocationPin | undefined;
  onChange: (pin: LocationPin | undefined) => void;
  /** Coarse city/region, used to prime the address search box. */
  cityHint?: string;
}) {
  const { status, maps } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const coords = value?.coordinates ?? null;

  // Keep the latest onChange reachable from map event handlers.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function reverseFill(lat: number, lng: number) {
    onChangeRef.current({ coordinates: { lat, lng }, address: value?.address, placeId: value?.placeId });
    try {
      const res = await clientApi.geocoding.reverse(lat, lng);
      if (res.configured && res.result) {
        onChangeRef.current({
          coordinates: { lat, lng },
          address: res.result.formatted,
          placeId: res.result.placeId,
        });
      }
    } catch {
      /* keep the dragged coordinates; address stays as-is */
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setHint(null);
    try {
      const res = await clientApi.geocoding.search(q);
      if (!res.configured) {
        setHint('Address search isn’t enabled in this environment. The campaign will use the city above.');
        return;
      }
      if (!res.result) {
        setHint('No match for that address. Try adding a city or postal code.');
        return;
      }
      onChange({
        coordinates: { lat: res.result.lat, lng: res.result.lng },
        address: res.result.formatted,
        placeId: res.result.placeId,
      });
    } catch (err) {
      setHint(errorMessage(err, 'Couldn’t look up that address.'));
    } finally {
      setSearching(false);
    }
  }

  // Initialize the interactive map once Maps JS is ready.
  useEffect(() => {
    if (status !== 'ready' || !maps || !containerRef.current || mapRef.current) return;
    const map = new maps.Map(containerRef.current, {
      center: coords ?? DEFAULT_CENTER,
      zoom: coords ? 14 : 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'cooperative',
      backgroundColor: '#e9eef5',
    });
    mapRef.current = map;
    map.addListener('click', (e?: google.maps.MapMouseEvent) => {
      const ll = e?.latLng;
      if (ll) void reverseFill(ll.lat(), ll.lng());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time init; pin sync handled below
  }, [status, maps]);

  // Sync the draggable marker + center with the current pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maps) return;

    if (!coords) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const marker = new maps.Marker({ position: coords, map, draggable: true, cursor: 'move' });
      marker.addListener('dragend', (e?: google.maps.MapMouseEvent) => {
        const ll = e?.latLng;
        if (ll) void reverseFill(ll.lat(), ll.lng());
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(coords);
    }
    map.panTo(coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coords drives the sync
  }, [coords?.lat, coords?.lng, maps]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      if (mapRef.current && maps) maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, [maps]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            placeholder={cityHint ? `Search an address near ${cityHint}…` : 'Search a street address…'}
            className="pl-10"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" disabled={searching} onClick={() => void handleSearch()}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find on map'}
        </Button>
      </div>

      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}

      {value?.coordinates && (
        <div className="flex items-start gap-2.5 rounded-lg border border-hair bg-secondary/50 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {value.address || 'Pinned location'}
            </p>
            <p className="font-mono text-[11.5px] text-faint">
              {value.coordinates.lat.toFixed(5)}, {value.coordinates.lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label="Clear pinned location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'ready' ? (
        <div
          ref={containerRef}
          className="min-h-[280px] w-full overflow-hidden rounded-xl border border-hair"
          role="application"
          aria-label="Map for pinning the campaign location"
        />
      ) : (
        <MapStatePanel
          status={status}
          className="min-h-[200px]"
          title="Map pinning coming soon"
          description="Pinning isn’t enabled in this environment. Creators will see the city above; the exact address is optional."
        />
      )}
    </div>
  );
}
