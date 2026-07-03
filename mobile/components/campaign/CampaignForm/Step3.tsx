/**
 * Step 3 — Location (PRD §7.4 + On-Site Location feature). A remote/online toggle;
 * when off, the business can drop an **exact pin** on a map (tap or drag) and/or
 * set the coarse city/state/country. The pin + address feed `location.coordinates`
 * / `location.address`.
 *
 * Graceful degradation: until the Google Maps SDK key is configured (`MAPS_ENABLED`)
 * the map is replaced by a "coming soon" placeholder and the business just sets the
 * city — no pin required. The moment maps are enabled the picker appears with no
 * other changes. Address search additionally requires the server-side Geocoding key.
 */
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Field, SwitchRow } from './fields';
import { AutocompleteField, Button, Icon } from '@/components/ui';
import {
  MapView,
  Marker,
  PROVIDER_GOOGLE,
  MAPS_AVAILABLE,
  MapPlaceholder,
  toLatLng,
  regionForPoint,
} from '@/components/campaign';
import { useTheme } from '@/components/ThemeProvider';
import { COUNTRIES, REGIONS, CITY_NAMES, locationForCity } from '@/lib/locations';
import { forwardGeocode, reverseGeocode, geocodingConfigured } from '@/lib/geocoding';
import { showToast } from '@/lib/toast';
import type RNMapView from 'react-native-maps';
import type { MapPressEvent, MarkerDragStartEndEvent } from 'react-native-maps';
import type { CampaignLocation } from '@/types';
import type { CampaignStepProps } from './Step1';

/** A wide default viewport when no pin has been dropped yet. */
const DEFAULT_REGION = { latitude: 20, longitude: 0, latitudeDelta: 80, longitudeDelta: 80 };

export function Step3({ value, patch }: CampaignStepProps) {
  const setLoc = (partial: Partial<CampaignLocation>) =>
    patch({ location: { ...value.location, ...partial } });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ marginBottom: 16 }}>
        <SwitchRow
          label="Remote / Online"
          hint="Creators can join from anywhere — no in-person visit needed."
          value={value.isRemote}
          onValueChange={(isRemote) => patch({ isRemote })}
        />
      </View>

      {!value.isRemote && (
        <>
          <PinPicker value={value} patch={patch} />

          <Field label="City">
            <AutocompleteField
              value={value.location.city ?? ''}
              onChangeText={(city) => setLoc({ city })}
              onSelect={(city) => {
                const loc = locationForCity(city);
                setLoc({
                  city,
                  state: loc?.state ?? value.location.state,
                  country: loc?.country ?? value.location.country,
                });
              }}
              options={CITY_NAMES}
              placeholder="Start typing the city…"
            />
          </Field>
          <Field label="State / Region">
            <AutocompleteField
              value={value.location.state ?? ''}
              onChangeText={(state) => setLoc({ state })}
              options={REGIONS}
              icon="mappin"
              placeholder="e.g. Ontario"
            />
          </Field>
          <Field label="Country">
            <AutocompleteField
              value={value.location.country ?? ''}
              onChangeText={(country) => setLoc({ country })}
              options={COUNTRIES}
              icon="mappin"
              placeholder="e.g. Canada"
            />
          </Field>
        </>
      )}
    </ScrollView>
  );
}

/**
 * The exact-pin map picker. Renders the "coming soon" placeholder until maps are
 * available; otherwise a map where tapping or dragging sets `coordinates`, plus
 * an address search box (when server-side geocoding is configured).
 */
function PinPicker({ value, patch }: CampaignStepProps) {
  const { colors } = useTheme();
  const mapRef = useRef<RNMapView>(null);
  const coords = value.location.coordinates;

  const [addr, setAddr] = useState(value.location.address ?? '');
  const [searching, setSearching] = useState(false);
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    let alive = true;
    geocodingConfigured().then((ok) => alive && setGeoReady(ok));
    return () => {
      alive = false;
    };
  }, []);

  /** Drop/move the pin, then best-effort reverse-geocode to fill the address. */
  const applyPin = async (lat: number, lng: number) => {
    const next: CampaignLocation = { ...value.location, coordinates: { lat, lng } };
    patch({ location: next });
    if (geoReady) {
      const hit = await reverseGeocode(lat, lng);
      if (hit?.formatted) {
        patch({
          location: { ...next, address: hit.formatted, placeId: hit.placeId ?? next.placeId },
        });
        setAddr(hit.formatted);
      }
    }
  };

  const runSearch = async () => {
    const q = addr.trim();
    if (!q) return;
    setSearching(true);
    try {
      const hit = await forwardGeocode(q);
      if (!hit) {
        showToast({ message: 'No match for that address — try tapping the map.', type: 'info' });
        return;
      }
      patch({
        location: {
          ...value.location,
          coordinates: { lat: hit.lat, lng: hit.lng },
          address: hit.formatted || q,
          placeId: hit.placeId,
        },
      });
      setAddr(hit.formatted || q);
      mapRef.current?.animateToRegion(regionForPoint({ lat: hit.lat, lng: hit.lng }), 450);
    } finally {
      setSearching(false);
    }
  };

  const clearPin = () => {
    const { coordinates, address, placeId, ...rest } = value.location;
    void coordinates;
    void address;
    void placeId;
    patch({ location: rest });
    setAddr('');
  };

  if (!MAPS_AVAILABLE) {
    return (
      <View style={{ marginBottom: 18, gap: 8 }}>
        <Text style={labelStyle(colors)}>Exact location</Text>
        <MapPlaceholder
          height={170}
          label="Pin-drop coming soon"
          hint="Set the city below for now — you'll be able to drop an exact map pin once maps are enabled."
        />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 18, gap: 10 }}>
      <Text style={labelStyle(colors)}>Exact location</Text>

      {geoReady && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              borderRadius: 12,
              paddingHorizontal: 12,
            }}
          >
            <Icon name="search" size={18} color={colors.text3} />
            <TextInput
              value={addr}
              onChangeText={setAddr}
              placeholder="Search an address…"
              placeholderTextColor={colors.text3}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 11, fontSize: 15.5, color: colors.text }}
            />
          </View>
          <Button variant="tonal" size="md" loading={searching} onPress={runSearch}>
            Find
          </Button>
        </View>
      )}

      <View
        style={{
          height: 230,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.hair,
        }}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={coords ? regionForPoint(coords) : DEFAULT_REGION}
          onPress={(e: MapPressEvent) =>
            applyPin(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
          }
        >
          {coords && (
            <Marker
              draggable
              coordinate={toLatLng(coords)}
              onDragEnd={(e: MarkerDragStartEndEvent) =>
                applyPin(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
              }
            />
          )}
        </MapView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="info" size={14} color={colors.text3} />
        <Text style={{ flex: 1, fontSize: 12.5, color: colors.text3, lineHeight: 17 }}>
          {coords
            ? 'Drag the pin to fine-tune. Creators only see an approximate area until you accept them.'
            : 'Tap the map to drop a pin on the exact spot.'}
        </Text>
        {coords && (
          <Button variant="ghost" size="sm" icon="x" onPress={clearPin}>
            Clear
          </Button>
        )}
      </View>

      {!!value.location.address && (
        <Text style={{ fontSize: 13, color: colors.text2 }} numberOfLines={2}>
          {value.location.address}
        </Text>
      )}
    </View>
  );
}

function labelStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return { fontSize: 13.5, fontWeight: '700' as const, color: colors.text, marginBottom: 2 };
}
