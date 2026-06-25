/**
 * Explore map view (On-Site Location feature) — the Airbnb-style discovery map
 * toggled from the Explore tab. Renders the same filtered `GET /api/campaigns`
 * results as price-bubble markers (`$X` from `reward.estimatedValue`, or a pin
 * when no value), with simple zoom-aware clustering and a tap-through mini card.
 *
 * Markers use the campaign's `approxCoordinates` (the server-fuzzed point) — the
 * exact pin is never sent to the feed. Remote / not-yet-pinned campaigns have no
 * coordinate and are surfaced via a "N of M shown on map" note rather than
 * silently dropped. Falls back to a "Map coming soon" placeholder until maps are
 * enabled.
 */
import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  MapView,
  Marker,
  PriceMarker,
  MAPS_AVAILABLE,
  MapPlaceholder,
  PROVIDER_GOOGLE,
  toLatLng,
  useMarkerSnapshot,
  type MapRegion,
} from './CampaignMap';
import { CampaignCard } from './CampaignCard';
import { useTheme } from '@/components/ThemeProvider';
import { formatCompactNumber } from '@/lib/utils';
import type RNMapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { GeoPoint } from '@/types';
import type { Campaign, BusinessProfile } from '@/types';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };

const DEFAULT_REGION: MapRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 80,
};

/** A campaign that carries a usable map point (fuzzed approx, or exact if owned). */
type Pinned = { id: string; point: GeoPoint; campaign: CampaignWithBusiness };

/** The bubble text for a campaign: "$2K" from estimatedValue, else empty (→ pin). */
function priceLabel(c: CampaignWithBusiness): string {
  const v = c.reward?.estimatedValue;
  return typeof v === 'number' && v > 0 ? `$${formatCompactNumber(v)}` : '';
}

/** Pull the best available map point off a campaign (exact pin or fuzzed approx). */
function pointOf(c: CampaignWithBusiness): GeoPoint | null {
  const loc = c.location;
  if (!loc) return null;
  if (loc.coordinates) return loc.coordinates;
  if (loc.approxCoordinates) return loc.approxCoordinates;
  return null;
}

/** A region that frames all the given points, with padding and a sane minimum span. */
function fitRegion(points: GeoPoint[]): MapRegion {
  if (points.length === 0) return DEFAULT_REGION;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
  };
}

type Cluster =
  | { type: 'single'; key: string; point: GeoPoint; pin: Pinned }
  | { type: 'cluster'; key: string; point: GeoPoint; count: number; members: Pinned[] };

/**
 * Grid clustering: bucket points into ~8 cells across the current viewport, then
 * collapse multi-point cells into one cluster bubble. Cheap, deterministic, and
 * good enough for v1 volumes (no native clustering dependency to break on New Arch).
 */
function clusterPins(pins: Pinned[], region: MapRegion): Cluster[] {
  const span = Math.max(region.longitudeDelta, region.latitudeDelta);
  const cell = span / 8;
  if (!Number.isFinite(cell) || cell <= 0) {
    return pins.map((pin) => ({ type: 'single', key: pin.id, point: pin.point, pin }));
  }
  const buckets = new Map<string, Pinned[]>();
  for (const pin of pins) {
    const key = `${Math.round(pin.point.lat / cell)}:${Math.round(pin.point.lng / cell)}`;
    const arr = buckets.get(key);
    if (arr) arr.push(pin);
    else buckets.set(key, [pin]);
  }
  const out: Cluster[] = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) {
      out.push({ type: 'single', key: group[0].id, point: group[0].point, pin: group[0] });
    } else {
      const lat = group.reduce((s, g) => s + g.point.lat, 0) / group.length;
      const lng = group.reduce((s, g) => s + g.point.lng, 0) / group.length;
      out.push({ type: 'cluster', key, point: { lat, lng }, count: group.length, members: group });
    }
  }
  return out;
}

export type ExploreMapProps = {
  items: CampaignWithBusiness[];
  onOpen: (id: string) => void;
  /**
   * Server-reported total matching the current query. The feed paginates, so
   * `items` is only the loaded page(s); `total` is the true universe used in the
   * coverage note so it doesn't understate (the map can't paginate — only the
   * list's infinite scroll grows `items`).
   */
  total?: number;
  /** Bottom inset so the mini card clears the tab bar. */
  bottomInset?: number;
};

export function ExploreMap({ items, onOpen, total, bottomInset = 0 }: ExploreMapProps) {
  const { colors } = useTheme();

  const pins = useMemo<Pinned[]>(() => {
    const acc: Pinned[] = [];
    for (const c of items) {
      const point = pointOf(c);
      if (point) acc.push({ id: c._id, point, campaign: c });
    }
    return acc;
  }, [items]);

  const [region, setRegion] = useState<MapRegion>(() => fitRegion(pins.map((p) => p.point)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<RNMapView>(null);

  const clusters = useMemo(() => clusterPins(pins, region), [pins, region]);
  const selected = useMemo(
    () => pins.find((p) => p.id === selectedId)?.campaign ?? null,
    [pins, selectedId],
  );
  // The universe to report: the server total when it exceeds what's loaded, else
  // the loaded count. `pins.length` is how many of those are actually on the map.
  const loadedTotal = typeof total === 'number' && total > items.length ? total : items.length;

  if (!MAPS_AVAILABLE) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
        <MapPlaceholder
          height={420}
          label="Map view coming soon"
          hint="Browse campaigns on an interactive map here once maps are enabled. For now, use the list."
          icon="compass"
        />
      </View>
    );
  }

  const zoomTo = (point: GeoPoint) => {
    const next: MapRegion = {
      latitude: point.lat,
      longitude: point.lng,
      latitudeDelta: Math.max(region.latitudeDelta / 2.5, 0.01),
      longitudeDelta: Math.max(region.longitudeDelta / 2.5, 0.01),
    };
    mapRef.current?.animateToRegion(next, 350);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={(r: Region) => setRegion(r)}
        onPress={() => setSelectedId(null)}
      >
        {clusters.map((cl) =>
          cl.type === 'single' ? (
            <PriceMarker
              key={cl.key}
              identifier={cl.key}
              point={cl.point}
              label={priceLabel(cl.pin.campaign)}
              selected={cl.pin.id === selectedId}
              onPress={() => {
                setSelectedId(cl.pin.id);
                zoomTo(cl.point);
              }}
            />
          ) : (
            <ClusterBubble
              key={cl.key}
              point={cl.point}
              count={cl.count}
              onPress={() => zoomTo(cl.point)}
            />
          ),
        )}
      </MapView>

      {/* Coverage note — never silently drop remote / unpinned campaigns. */}
      {pins.length === 0 ? (
        <View style={overlayBox(colors, 'top')}>
          <Text style={{ fontSize: 12.5, color: colors.text2, textAlign: 'center' }}>
            No campaigns have a map location yet — switch to the list to see all {loadedTotal}.
          </Text>
        </View>
      ) : pins.length < loadedTotal ? (
        <View style={overlayBox(colors, 'top')}>
          <Text style={{ fontSize: 12.5, color: colors.text2 }}>
            {pins.length} of {loadedTotal} shown on map · rest are remote/unpinned
          </Text>
        </View>
      ) : null}

      {/* Tap-through mini card. */}
      {selected ? (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: bottomInset + 12,
          }}
        >
          <CampaignCard
            campaign={selected}
            businessName={selected.business?.businessName}
            compact
            onPress={() => onOpen(selected._id)}
          />
        </View>
      ) : null}
    </View>
  );
}

/** A round count bubble standing in for several overlapping markers. */
function ClusterBubble({
  point,
  count,
  onPress,
}: {
  point: GeoPoint;
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { tracksViewChanges, onLayout } = useMarkerSnapshot(String(count));
  if (!Marker) return null;
  return (
    <Marker coordinate={toLatLng(point)} onPress={onPress} tracksViewChanges={tracksViewChanges}>
      <View
        onLayout={onLayout}
        style={{
          minWidth: 38,
          height: 38,
          paddingHorizontal: 8,
          borderRadius: 19,
          backgroundColor: colors.accent,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}
        >
          {count}
        </Text>
      </View>
    </Marker>
  );
}

function overlayBox(colors: ReturnType<typeof useTheme>['colors'], pos: 'top' | 'bottom') {
  return {
    position: 'absolute' as const,
    [pos]: 12,
    alignSelf: 'center' as const,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '92%' as const,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  };
}
