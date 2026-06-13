/**
 * Step 3 — Location (PRD §7.4). A remote/online toggle; when off, collect the
 * city (required), state, and country. Matches the Campaign model's
 * `isRemote` + optional `location` shape.
 */
import { ScrollView, View } from 'react-native';
import { Field, TextField, SwitchRow } from './fields';
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
            <TextField
              value={value.location.city ?? ''}
              onChangeText={(city) => setLoc({ city })}
              placeholder="e.g. Bengaluru"
              autoCapitalize="words"
            />
          </Field>
          <Field label="State / Region">
            <TextField
              value={value.location.state ?? ''}
              onChangeText={(state) => setLoc({ state })}
              placeholder="e.g. Karnataka"
              autoCapitalize="words"
            />
          </Field>
          <Field label="Country">
            <TextField
              value={value.location.country ?? ''}
              onChangeText={(country) => setLoc({ country })}
              placeholder="e.g. India"
              autoCapitalize="words"
            />
          </Field>
        </>
      )}
    </ScrollView>
  );
}
