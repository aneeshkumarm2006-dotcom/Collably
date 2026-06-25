/**
 * Shared map primitives for the On-Site Location feature, used by the campaign
 * form picker (Step 3), the campaign detail screen, and the Explore map view.
 *
 * Two things make this safe to ship before any Google key exists:
 *
 *  1. **Guarded native require.** `react-native-maps` is a native module that
 *     only exists in a dev/EAS build (never Expo Go, never web). We `require` it
 *     in a try/catch so an old binary / web / missing install degrades to a
 *     placeholder instead of crashing the whole screen on import.
 *  2. **`MAPS_AVAILABLE` gate.** True only when the native module loaded AND a
 *     Maps SDK key is configured for this build (`MAPS_ENABLED`, from env) AND
 *     we're not on web. Every screen renders `<MapPlaceholder/>` ("coming soon")
 *     until that's true, then the real map appears with no other code changes.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import type { MapViewProps } from 'react-native-maps';
import type { GeoPoint } from '@/types';
import { MAPS_ENABLED } from '@/lib/env';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';

// --- Guarded native module ----------------------------------------------------

type MapsModule = typeof import('react-native-maps');

let Maps: MapsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Maps = require('react-native-maps') as MapsModule;
} catch {
  Maps = null;
}

/**
 * The native map components. Typed as non-null `ComponentType` for ergonomic JSX
 * — at runtime they're `undefined` when maps aren't available, so callers MUST
 * gate on `MAPS_AVAILABLE` before rendering them (every screen here does).
 */
export const MapView = Maps?.default as MapsModule['default'];
export const Marker = Maps?.Marker as MapsModule['Marker'];
export const Circle = Maps?.Circle as MapsModule['Circle'];
export const PROVIDER_GOOGLE = Maps?.PROVIDER_GOOGLE;

/** Maps can actually render: native module present + key configured + not web. */
export const MAPS_AVAILABLE = Boolean(MAPS_ENABLED && Maps?.default && Platform.OS !== 'web');

// --- Geo helpers --------------------------------------------------------------

/** react-native-maps coordinate shape (note: `latitude`/`longitude`, not lat/lng). */
export type LatLng = { latitude: number; longitude: number };

/** A map viewport region. */
export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

/** Convert our domain `{ lat, lng }` to the map's `{ latitude, longitude }`. */
export function toLatLng(p: GeoPoint): LatLng {
  return { latitude: p.lat, longitude: p.lng };
}

/** Build a region centred on a point. `spanMeters` ≈ the visible height. */
export function regionForPoint(p: GeoPoint, spanMeters = 1500): MapRegion {
  const latDelta = spanMeters / 111_320;
  const cosLat = Math.cos((p.lat * Math.PI) / 180) || 1e-6;
  return {
    latitude: p.lat,
    longitude: p.lng,
    latitudeDelta: latDelta,
    longitudeDelta: latDelta / cosLat,
  };
}

/** Open a coordinate in the OS maps app (Apple Maps on iOS, Google/geo elsewhere). */
export function openInMaps(p: GeoPoint, label?: string): void {
  const query = label ? encodeURIComponent(label) : `${p.lat},${p.lng}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${p.lat},${p.lng}&q=${query}`,
    default: `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${query})`,
  })!;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`).catch(
      () => {},
    );
  });
}

// --- "Coming soon" placeholder ------------------------------------------------

export type MapPlaceholderProps = {
  /** Pixel height of the placeholder box. */
  height?: number;
  /** Big label. Defaults to "Map coming soon". */
  label?: string;
  /** Smaller helper line under the label. */
  hint?: string;
  /** Icon shown above the label. Defaults to a map pin. */
  icon?: IconName;
  /** Round the corners (off for full-bleed embeds). */
  rounded?: boolean;
};

/**
 * The graceful-degradation surface shown wherever a map would go until the Maps
 * SDK key is configured. Intentionally calm and on-brand — not an error state.
 */
export function MapPlaceholder({
  height = 190,
  label = 'Map coming soon',
  hint,
  icon = 'mappin',
  rounded = true,
}: MapPlaceholderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: rounded ? 16 : 0,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={24} color={colors.accent} />
      </View>
      <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text }}>{label}</Text>
      {hint ? (
        <Text style={{ fontSize: 12.5, color: colors.text3, textAlign: 'center', lineHeight: 18 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// --- Custom-marker rasterization helper ---------------------------------------

/**
 * Android renders a custom marker child to a bitmap and, by default, freezes that
 * snapshot to keep panning smooth (`tracksViewChanges={false}`). If the snapshot
 * is captured before the marker's (bold) content has measured, the trailing
 * glyphs get clipped — e.g. a "$1.2K" price bubble shows just "$1.2" with the
 * rest cut off. This hook anchors the freeze to an actual layout pass instead of
 * a guessed delay: it keeps re-rasterizing until the bubble has laid out for the
 * *current* content, then settles a few frames later.
 *
 * Wire `tracksViewChanges` onto the `<Marker>` and `onLayout` onto its child view,
 * and pass a `contentKey` that changes whenever the rendered content does so a new
 * label/selection re-arms the capture.
 */
export function useMarkerSnapshot(contentKey: string): {
  tracksViewChanges: boolean;
  onLayout: () => void;
} {
  const [tracksViewChanges, setTracks] = useState(true);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-arm whenever the rendered content changes.
  useEffect(() => {
    setTracks(true);
  }, [contentKey]);

  // Drop any pending settle on unmount.
  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  const onLayout = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    // A couple of frames after the view has measured, freeze the bitmap.
    settle.current = setTimeout(() => setTracks(false), 250);
  }, []);

  return { tracksViewChanges, onLayout };
}

// --- Airbnb-style price bubble marker -----------------------------------------

export type PriceMarkerProps = {
  point: GeoPoint;
  /** Bubble text — e.g. "$2,000". Empty → a generic pin glyph is shown instead. */
  label?: string;
  selected?: boolean;
  onPress?: () => void;
  /** Stable key for React when used in a list of markers. */
  identifier?: string;
};

/**
 * A tappable price bubble used on the Explore map. The bitmap freeze is anchored
 * to the bubble's layout (see `useMarkerSnapshot`) so the value never renders
 * clipped, and the text is pinned to a single, non-scaling line so its width
 * stays exactly what the snapshot measured.
 */
export function PriceMarker({ point, label, selected, onPress, identifier }: PriceMarkerProps) {
  const { colors } = useTheme();
  const { tracksViewChanges, onLayout } = useMarkerSnapshot(`${label ?? ''}|${selected ? 1 : 0}`);

  if (!Marker) return null;

  const bg = selected ? colors.accent : colors.bgElev;
  const fg = selected ? '#FFFFFF' : colors.text;

  return (
    <Marker
      identifier={identifier}
      coordinate={toLatLng(point)}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View
        onLayout={onLayout}
        style={{
          paddingHorizontal: label ? 11 : 8,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.hair,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        {label ? (
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: fg,
              includeFontPadding: false,
              textAlign: 'center',
            }}
          >
            {label}
          </Text>
        ) : (
          <Icon name="mappin" size={15} color={fg} strokeWidth={2.2} />
        )}
      </View>
    </Marker>
  );
}

// --- Map frame ----------------------------------------------------------------

export type CampaignMapProps = {
  height?: number;
  rounded?: boolean;
  children?: ReactNode;
  /** Forwarded to the underlying MapView (region, onPress, scroll flags, etc.). */
  mapProps?: MapViewProps;
  /** Placeholder copy shown when maps aren't available yet. */
  placeholder?: Omit<MapPlaceholderProps, 'height' | 'rounded'>;
};

/**
 * A rounded MapView frame that renders the "coming soon" placeholder until maps
 * are available. Screens pass region/handlers via `mapProps` and markers/circles
 * as children. Always uses the Google provider so iOS matches Android.
 */
export function CampaignMap({
  height = 190,
  rounded = true,
  children,
  mapProps = {},
  placeholder,
}: CampaignMapProps) {
  if (!MAPS_AVAILABLE || !MapView) {
    return <MapPlaceholder height={height} rounded={rounded} {...placeholder} />;
  }
  return (
    <View style={{ height, borderRadius: rounded ? 16 : 0, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} provider={PROVIDER_GOOGLE} {...mapProps}>
        {children}
      </MapView>
    </View>
  );
}
