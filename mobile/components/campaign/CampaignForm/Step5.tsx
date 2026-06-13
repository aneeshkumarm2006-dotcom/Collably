/**
 * Step 5 — Deliverables builder (PRD §7.4). A repeatable list of deliverable rows
 * (platform · content type · quantity · optional requirements). Add/remove rows;
 * each maps to a `CampaignDeliverable` on the campaign model.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { PLATFORMS, CONTENT_TYPES } from '@/constants';
import type { CampaignDeliverable } from '@/types';
import { Button, Card, Icon, TagChip } from '@/components/ui';
import { Field, TextField, NumberStepper } from './fields';
import type { CampaignStepProps } from './Step1';

export function Step5({ value, patch }: CampaignStepProps) {
  const { colors } = useTheme();

  const update = (index: number, partial: Partial<CampaignDeliverable>) => {
    const next = value.deliverables.map((d, i) => (i === index ? { ...d, ...partial } : d));
    patch({ deliverables: next });
  };
  const remove = (index: number) => patch({ deliverables: value.deliverables.filter((_, i) => i !== index) });
  const add = () =>
    patch({ deliverables: [...value.deliverables, { platform: 'Instagram', contentType: 'Post', quantity: 1 }] });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {value.deliverables.map((d, i) => (
        <Card key={i} style={{ marginBottom: 14 }} padding={14}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2 }}>Deliverable {i + 1}</Text>
            {value.deliverables.length > 1 && (
              <Pressable onPress={() => remove(i)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Icon name="trash" size={18} color={colors.danger} strokeWidth={1.8} />
              </Pressable>
            )}
          </View>

          <Field label="Platform">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map((p) => (
                <TagChip key={p} label={p} small selected={d.platform === p} onPress={() => update(i, { platform: p })} />
              ))}
            </View>
          </Field>

          <Field label="Content type">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CONTENT_TYPES.map((ct) => (
                <TagChip key={ct} label={ct} small selected={d.contentType === ct} onPress={() => update(i, { contentType: ct })} />
              ))}
            </View>
          </Field>

          <Field label="Quantity">
            <NumberStepper value={d.quantity} onChange={(quantity) => update(i, { quantity })} min={1} max={50} />
          </Field>

          <Field label="Requirements (optional)" hint="e.g. tag us, use #hashtag, keep it up for 7 days.">
            <TextField
              value={d.requirements ?? ''}
              onChangeText={(requirements) => update(i, { requirements })}
              placeholder="Any specific asks"
              autoCapitalize="sentences"
              maxLength={200}
            />
          </Field>
        </Card>
      ))}

      <Button variant="tonal" icon="plus" block onPress={add}>
        Add another deliverable
      </Button>
    </ScrollView>
  );
}
