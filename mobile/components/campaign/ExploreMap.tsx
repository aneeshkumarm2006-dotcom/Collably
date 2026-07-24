/**
 * Explore map view (On-Site Location feature) — the premium "Local Creator Crew"
 * discovery map toggled from the Explore tab. Renders the filtered
 * `GET /api/campaigns` results as clean CATEGORY-COLORED teardrop pins, with a
 * "Search this area" pill, floating layers/recenter buttons, the user's blue
 * location dot + soft radius, and a bottom result-card carousel.
 *
 * Markers use the campaign's `approxCoordinates` (the server-fuzzed point) — the
 * exact pin is never sent to the feed. Remote / not-yet-pinned campaigns have no
 * coordinate and are surfaced via a "N of M shown on map" note rather than
 * silently dropped. Falls back to a "Map coming soon" placeholder until maps are
 * enabled.
 *
 * A compact `preview` mode renders just the map + pins (no overlays, gestures
 * disabled) so the Explore page's "Nearby Campaigns" strip can tap through to the
 * full map.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Text, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import {
  MapView,
  Marker,
  Circle,
  MAPS_AVAILABLE,
  MapPlaceholder,
  PROVIDER_GOOGLE,
  toLatLng,
  useMarkerSnapshot,
  type MapRegion,
} from './CampaignMap';
import { Icon, type IconName } from '@/components/ui';
import { Pressable } from '@/components/ui/SafePressable';
import { CampaignCard } from './CampaignCard';
import { CATEGORY_ICON, categoryTint } from '@/components/home';
import { useTheme } from '@/components/ThemeProvider';
import Reanimated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import type RNMapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { GeoPoint } from '@/types';
import type { Campaign, BusinessProfile } from '@/types';
import type { Category } from '@/constants';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };

const DEFAULT_REGION: MapRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 80,
};

/** A campaign that carries a usable map point (fuzzed approx, or exact if owned). */
type Pinned = { id: string; point: GeoPoint; campaign: CampaignWithBusiness };

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
  /**
   * When true (a search / filter is active) the map frames the result pins instead
   * of sitting on the user's location — so searching a place actually shows it.
   */
  fitToResults?: boolean;
  /**
   * Compact preview mode for the Explore page "Nearby" strip: renders just the map
   * + pins with gestures disabled and no overlays; the whole surface taps through
   * via `onPressPreview` instead of being interactive.
   */
  preview?: boolean;
  /** Tap handler for the whole map in `preview` mode (opens the full map). */
  onPressPreview?: () => void;
  /** "Search this area" handler — re-runs the current query. */
  onSearchArea?: () => void;
};

export function ExploreMap({
  items,
  onOpen,
  total,
  bottomInset = 0,
  fitToResults = false,
  preview = false,
  onPressPreview,
  onSearchArea,
}: ExploreMapProps) {
  const { colors, isDark } = useTheme();

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
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);
  // Layers toggle: standard ⇄ satellite/hybrid imagery.
  const [satellite, setSatellite] = useState(false);
  const mapRef = useRef<RNMapView>(null);
  // Read the latest `fitToResults` inside the async mount effect without re-running it.
  const fitToResultsRef = useRef(fitToResults);
  fitToResultsRef.current = fitToResults;
  const { width } = useWindowDimensions();
  const cardListRef = useRef<FlatList<Pinned>>(null);

  // Ask for location once, then center the discovery map on the user so they see
  // the collabs/brands around them (not a world view).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !active) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const p: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPoint(p);
        // Don't yank the camera to the user's GPS when a search/filter is active —
        // the fit-to-results effect owns it then (otherwise this async location,
        // which resolves later, snaps the map back off the searched result).
        if (!fitToResultsRef.current) {
          mapRef.current?.animateToRegion(
            { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 },
            600,
          );
        }
      } catch {
        /* permission denied / unavailable — fall back to the campaign-fit region */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const recenter = () => {
    if (!userPoint) return;
    mapRef.current?.animateToRegion(
      { latitude: userPoint.lat, longitude: userPoint.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 },
      500,
    );
  };

  // When a search / filter is active, frame the result pins so the searched
  // location is what you see — otherwise the map would stay on the user's GPS.
  useEffect(() => {
    if (!fitToResults || pins.length === 0) return;
    mapRef.current?.animateToRegion(fitRegion(pins.map((p) => p.point)), 500);
  }, [fitToResults, pins]);

  const clusters = useMemo(() => clusterPins(pins, region), [pins, region]);
  // The universe to report: the server total when it exceeds what's loaded, else
  // the loaded count. `pins.length` is how many of those are actually on the map.
  const loadedTotal = typeof total === 'number' && total > items.length ? total : items.length;
  // A pinned collab shows a result-card carousel at the bottom; it auto-sizes so a
  // single result is near-full-width and multiple cards peek to signal "swipe".
  const showCards = !preview && pins.length > 0;
  const cardW = pins.length <= 1 ? width - 24 : Math.round(width * 0.82);

  if (!MAPS_AVAILABLE) {
    if (preview) {
      return (
        <Pressable
          onPress={onPressPreview}
          accessibilityRole="button"
          accessibilityLabel="Open full map"
          style={{ flex: 1 }}
        >
          <MapPlaceholder height={180} rounded={false} label="Map preview" icon="compass" />
        </Pressable>
      );
    }
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

  const mapType = satellite ? 'hybrid' : Platform.OS === 'ios' ? 'mutedStandard' : 'standard';

  const markers = clusters.map((cl) =>
    cl.type === 'single' ? (
      <CategoryPin
        key={cl.key}
        identifier={cl.key}
        point={cl.point}
        category={cl.pin.campaign.category}
        selected={!preview && cl.pin.id === selectedId}
        onPress={
          preview
            ? undefined
            : () => {
                setSelectedId(cl.pin.id);
                const idx = pins.findIndex((p) => p.id === cl.pin.id);
                if (idx >= 0) cardListRef.current?.scrollToIndex({ index: idx, animated: true });
                zoomTo(cl.point);
              }
        }
      />
    ) : (
      <ClusterBubble
        key={cl.key}
        point={cl.point}
        count={cl.count}
        onPress={preview ? undefined : () => zoomTo(cl.point)}
      />
    ),
  );

  const map = (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      mapType={mapType}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      showsUserLocation
      showsMyLocationButton={false}
      initialRegion={region}
      onRegionChangeComplete={preview ? undefined : (r: Region) => setRegion(r)}
      onPress={preview ? undefined : () => setSelectedId(null)}
      scrollEnabled={!preview}
      zoomEnabled={!preview}
      rotateEnabled={!preview}
      pitchEnabled={!preview}
      toolbarEnabled={false}
    >
      {/* discovery radius around the user */}
      {userPoint && Circle ? (
        <Circle
          center={toLatLng(userPoint)}
          radius={6000}
          strokeColor="rgba(24,119,242,0.55)"
          fillColor="rgba(24,119,242,0.10)"
          strokeWidth={1.5}
        />
      ) : null}
      {markers}
    </MapView>
  );

  // --- Preview (Nearby strip) — just the map, tap-through, no overlays. ---
  if (preview) {
    return (
      <View style={{ flex: 1 }}>
        {map}
        {/* Transparent tap layer: the map's own gestures are disabled in preview,
            so this captures the tap to open the full map. */}
        <Pressable
          onPress={onPressPreview}
          accessibilityRole="button"
          accessibilityLabel="Open full map"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {map}

      {/* "Search this area" pill, centered near the top. */}
      {onSearchArea ? (
        <Pressable
          onPress={onSearchArea}
          accessibilityRole="button"
          accessibilityLabel="Search this area"
          style={{
            position: 'absolute',
            top: 12,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: colors.bgElev,
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 9,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Icon name="search" size={15} color={colors.accent} strokeWidth={2.2} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Search this area</Text>
        </Pressable>
      ) : null}

      {/* Coverage note — never silently drop remote / unpinned campaigns. */}
      {pins.length === 0 ? (
        <View style={overlayBox(colors)}>
          <Text style={{ fontSize: 12.5, color: colors.text2, textAlign: 'center' }}>
            No campaigns have a map location yet — switch to the list to see all {loadedTotal}.
          </Text>
        </View>
      ) : pins.length < loadedTotal ? (
        <View style={overlayBox(colors)}>
          <Text style={{ fontSize: 12.5, color: colors.text2 }}>
            {pins.length} of {loadedTotal} shown on map · rest are remote/unpinned
          </Text>
        </View>
      ) : null}

      {/* Right-side floating controls: layers + recenter, stacked above the cards. */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: showCards ? bottomInset + 138 : bottomInset + 16,
          gap: 10,
        }}
      >
        <MapFab
          icon="grid"
          label={satellite ? 'Standard map' : 'Satellite map'}
          active={satellite}
          onPress={() => setSatellite((s) => !s)}
        />
        {userPoint ? <MapFab icon="mappin" label="Center on my location" onPress={recenter} /> : null}
      </View>

      {/* Result-card carousel — one card per pinned collab. Auto-sizes to the count,
          taps open the collab, and swiping pans the map to that card's pin. The
          bottom offset clears the FULL tab-bar height so the card is never half-cut. */}
      {showCards ? (
        <Reanimated.View
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(150)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: bottomInset + 24 }}
        >
          <FlatList
            ref={cardListRef}
            data={pins}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardW + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 12 }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            getItemLayout={(_, index) => ({ length: cardW + 12, offset: (cardW + 12) * index, index })}
            onScrollToIndexFailed={() => undefined}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (cardW + 12));
              const p = pins[idx];
              if (p) {
                setSelectedId(p.id);
                mapRef.current?.animateToRegion(
                  { latitude: p.point.lat, longitude: p.point.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 },
                  350,
                );
              }
            }}
            renderItem={({ item }) => (
              <View style={{ width: cardW }}>
                <CampaignCard
                  campaign={item.campaign}
                  businessName={item.campaign.business?.businessName}
                  compact
                  onPress={() => onOpen(item.campaign._id)}
                />
              </View>
            )}
          />
        </Reanimated.View>
      ) : null}
    </View>
  );
}

/** A round white floating action button on the map. */
function MapFab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: active ? colors.accent : colors.bgElev,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.hair,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}
    >
      <Icon name={icon} size={21} color={active ? colors.accentText : colors.accent} strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * A clean category-colored teardrop pin: a rounded chip filled with the category
 * color holding the category's white icon, with a small pointer at the tip
 * (anchored y:1). Snapshot-frozen (via `useMarkerSnapshot`) so custom markers
 * don't render half-cut on Android.
 */
function CategoryPin({
  point,
  category,
  selected,
  onPress,
  identifier,
}: {
  point: GeoPoint;
  category: Category;
  selected?: boolean;
  onPress?: () => void;
  identifier?: string;
}) {
  const { isDark } = useTheme();
  const color = categoryTint(category, isDark).fg;
  const { tracksViewChanges, onLayout } = useMarkerSnapshot(`${category}|${selected ? 1 : 0}`);
  if (!Marker) return null;
  const size = selected ? 42 : 36;
  return (
    <Marker
      identifier={identifier}
      coordinate={toLatLng(point)}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View onLayout={onLayout} style={{ alignItems: 'center' }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderWidth: 2.5,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.28,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <Icon name={CATEGORY_ICON[category]} size={selected ? 20 : 17} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        {/* pointer tip connecting the chip to the coordinate */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 9,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#FFFFFF',
            marginTop: -3,
          }}
        />
      </View>
    </Marker>
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
  onPress?: () => void;
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

function overlayBox(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    position: 'absolute' as const,
    top: 60,
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
