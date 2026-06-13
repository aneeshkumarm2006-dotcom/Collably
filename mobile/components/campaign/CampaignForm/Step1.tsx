/**
 * Step 1 — Basics (PRD §7.4): campaign title, description, and category. These are
 * the required identity fields; the screen gates "Next" on `validateStep(1, …)`.
 */
import { ScrollView, View } from 'react-native';
import { CATEGORIES } from '@/constants';
import { TagChip } from '@/components/ui';
import { Field, TextField, TextArea } from './fields';
import type { CampaignFormState, CampaignFormPatch } from './formState';

export type CampaignStepProps = {
  value: CampaignFormState;
  patch: CampaignFormPatch;
};

export function Step1({ value, patch }: CampaignStepProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Field label="Campaign title" hint="Keep it punchy — this is the headline creators see first.">
        <TextField
          value={value.title}
          onChangeText={(title) => patch({ title })}
          placeholder="e.g. Summer menu tasting reels"
          autoCapitalize="sentences"
          maxLength={80}
        />
      </Field>

      <Field label="Description" hint="What's the collab about, what do you expect, any do's & don'ts.">
        <TextArea
          value={value.description}
          onChangeText={(description) => patch({ description })}
          placeholder="Describe the campaign, the vibe, and what a great submission looks like…"
          maxLength={1200}
        />
      </Field>

      <Field label="Category">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <TagChip key={c} label={c} selected={value.category === c} onPress={() => patch({ category: c })} />
          ))}
        </View>
      </Field>
    </ScrollView>
  );
}
