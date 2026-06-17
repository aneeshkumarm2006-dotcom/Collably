/**
 * Step 3 — Location (PRD §7.4). A remote/online toggle; when off, collect the
 * city (required), state, and country. Matches the Campaign model's
 * `isRemote` + optional `location` shape.
 */
import { ScrollView, View } from 'react-native';
import { Field, SwitchRow } from './fields';
import { AutocompleteField } from '@/components/ui';
import { COUNTRIES, REGIONS, CITY_NAMES, locationForCity } from '@/lib/locations';
import type { CampaignStepProps } from './Step1';

export function Step3({ value, patch }: CampaignStepProps) {
  const setLoc = (partial: Partial<typeof value.location>) => patch({ location: { ...value.location, ...partial } });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
          <Field label="City">
            <AutocompleteField
              value={value.location.city ?? ''}
              onChangeText={(city) => setLoc({ city })}
              onSelect={(city) => {
                const loc = locationForCity(city);
                setLoc({ city, state: loc?.state ?? value.location.state, country: loc?.country ?? value.location.country });
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
