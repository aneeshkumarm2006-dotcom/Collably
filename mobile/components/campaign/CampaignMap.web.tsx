/**
 * Web build of the campaign map primitives.
 *
 * `react-native-maps` pulls in native-only internals (`codegenNativeCommands`,
 * etc.) that Metro cannot bundle for web — even behind a runtime try/catch, the
 * static `require` is resolved at bundle time and fails. So on web we ship this
 * sibling (Metro prefers `*.web.tsx`) which keeps the *exact same export surface*
 * as `CampaignMap.tsx` but never references the native module: maps are simply
 * "unavailable", and every screen falls back to `<MapPlaceholder/>` as designed.
 *
 * Keep this file's exports in sync with `CampaignMap.tsx`.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import type { MapViewProps } from 'react-native-maps'; // type-only → erased at build, safe on web
import type { GeoPoint } from '@/types';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';

// --- Native module stand-ins --------------------------------------------------
// No native map on web. These are intentionally null/undefined; callers gate on
// `MAPS_AVAILABLE` (always false here) before ever touching them.

export const MapView = undefined as unknown as typeof import('react-native-maps')['default'];
export const Marker = undefined as unknown as typeof import('react-native-maps')['Marker'];
export const Circle = undefined as unknown as typeof import('react-native-maps')['Circle'];
export const PROVIDER_GOOGLE = undefined;

/** Maps can never render on web — always degrade to the placeholder. */
export const MAPS_AVAILABLE = false;

// --- Geo helpers (identical to native) ----------------------------------------

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

/** Open a coordinate in the OS maps app (a new tab to Google Maps on web). */
export function openInMaps(p: GeoPoint, label?: string): void {
  const query = label ? encodeURIComponent(label) : `${p.lat},${p.lng}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${p.lat},${p.lng}&q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
  })!;
  Linking.openURL(url).catch(() => {});
}

// --- "Coming soon" placeholder (identical to native) --------------------------

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

// --- Price bubble marker ------------------------------------------------------
// No native marker on web, so this is a no-op (callers only render it as a child
// of a MapView, which itself never renders here).

export type PriceMarkerProps = {
  point: GeoPoint;
  /** Bubble text — e.g. "$2,000". Empty → a generic pin glyph is shown instead. */
  label?: string;
  selected?: boolean;
  onPress?: () => void;
  /** Stable key for React when used in a list of markers. */
  identifier?: string;
};

export function PriceMarker(_props: PriceMarkerProps) {
  // Re-create the hook usage shape so this stays a valid component if ever rendered.
  const [, setTracks] = useState(true);
  useEffect(() => setTracks(false), []);
  return null;
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

/** On web there is no MapView — always render the placeholder frame. */
export function CampaignMap({
  height = 190,
  rounded = true,
  placeholder,
}: CampaignMapProps) {
  return <MapPlaceholder height={height} rounded={rounded} {...placeholder} />;
}
