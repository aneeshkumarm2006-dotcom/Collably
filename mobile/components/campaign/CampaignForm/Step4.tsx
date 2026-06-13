/**
 * Step 4 — Reward (PRD §7.4). Pick a reward type, describe what the creator gets,
 * and optionally set an estimated value (drives the "Reward value" stub on cards
 * and the §13 reward sort).
 */
import { ScrollView, View } from 'react-native';
import { REWARD_TYPES } from '@/constants';
import { TagChip } from '@/components/ui';
import { Field, TextField } from './fields';
import type { CampaignStepProps } from './Step1';

export function Step4({ value, patch }: CampaignStepProps) {
  const setReward = (partial: Partial<typeof value.reward>) => patch({ reward: { ...value.reward, ...partial } });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Field label="Reward type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REWARD_TYPES.map((r) => (
            <TagChip key={r} label={r} selected={value.reward.type === r} onPress={() => setReward({ type: r })} />
          ))}
        </View>
      </Field>

      <Field label="What the creator gets" hint="Be specific — e.g. 'Tasting menu for two + a gift voucher'.">
        <TextField
          value={value.reward.description}
          onChangeText={(description) => setReward({ description })}
          placeholder="Describe the reward"
          autoCapitalize="sentences"
          maxLength={160}
        />
      </Field>

      <Field label="Estimated value (₹)" hint="Optional. Shown as the reward value and used to sort by reward.">
        <TextField
          value={value.reward.estimatedValue ? String(value.reward.estimatedValue) : ''}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            setReward({ estimatedValue: Number.isFinite(n) ? n : undefined });
          }}
          placeholder="e.g. 2000"
          keyboardType="numeric"
        />
      </Field>
    </ScrollView>
  );
}
