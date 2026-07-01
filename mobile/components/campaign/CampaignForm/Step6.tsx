/**
 * Step 6 — Settings (PRD §7.4): application deadline (native DateTimePicker),
 * minimum follower requirement, and freeform tags. These feed the campaign's
 * `deadline`, `minFollowers`, and `tags`. (There's no capacity to set — a business
 * approves as many applicants as it wants.)
 */
import { createElement, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/components/ThemeProvider';
import { formatDate } from '@/lib/utils';
import { Icon, TagChip } from '@/components/ui';
import { Field, TextField } from './fields';
import type { CampaignStepProps } from './Step1';

export function Step6({ value, patch }: CampaignStepProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const deadlineDate = value.deadline ? new Date(value.deadline) : null;
  const minDate = new Date(); // can't pick a past deadline
  const toYMD = (d: Date) => d.toISOString().slice(0, 10); // <input type="date"> wants YYYY-MM-DD

  const onPickDate = (event: DateTimePickerEvent, date?: Date) => {
    // Android fires once and closes; iOS stays open (inline spinner).
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && date) patch({ deadline: date.toISOString() });
  };

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, '');
    if (t && !value.tags.includes(t) && value.tags.length < 10) patch({ tags: [...value.tags, t] });
    setTagDraft('');
  };
  const removeTag = (tag: string) => patch({ tags: value.tags.filter((t) => t !== tag) });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Field label="Application deadline" hint="After this date the campaign stops accepting applications.">
        <Pressable
          onPress={() => setShowPicker((s) => !s)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: showPicker ? colors.accent : colors.hair,
            borderRadius: 12,
            paddingHorizontal: 13,
            paddingVertical: 14,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Icon name="calendar" size={18} color={colors.text3} />
          <Text style={{ flex: 1, fontSize: 16, color: deadlineDate ? colors.text : colors.text3 }}>
            {deadlineDate ? formatDate(deadlineDate) : 'Select a date'}
          </Text>
          <Icon name="chevD" size={18} color={colors.text3} />
        </Pressable>
        {showPicker &&
          (Platform.OS === 'web' ? (
            // @react-native-community/datetimepicker has no web build, so on web we
            // render a real HTML date input (rendered as a DOM node by react-native-web).
            createElement('input', {
              type: 'date',
              min: toYMD(minDate),
              value: deadlineDate ? toYMD(deadlineDate) : '',
              onChange: (e: { target: { value: string } }) => {
                const v = e.target.value;
                if (v) patch({ deadline: new Date(`${v}T00:00:00`).toISOString() });
                setShowPicker(false);
              },
              style: {
                marginTop: 8,
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: colors.card,
                color: colors.text,
                border: `1px solid ${colors.hair}`,
                borderRadius: 12,
                padding: '14px 13px',
                fontSize: 16,
                colorScheme: colors.dark ? 'dark' : 'light',
              },
            })
          ) : (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <DateTimePicker
                value={deadlineDate ?? minDate}
                mode="date"
                minimumDate={minDate}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onPickDate}
                themeVariant={colors.dark ? 'dark' : 'light'}
              />
            </View>
          ))}
      </Field>

      <Field label="Minimum followers" hint="0 = open to everyone (great for UGC creators).">
        <TextField
          value={value.minFollowers ? String(value.minFollowers) : ''}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            patch({ minFollowers: Number.isFinite(n) ? n : 0 });
          }}
          placeholder="e.g. 1000"
          keyboardType="numeric"
        />
      </Field>

      <Field label="How many creators?" hint="How many creators to accept before the campaign auto-closes.">
        <TextField
          value={value.maxCreators ? String(value.maxCreators) : ''}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            patch({ maxCreators: Number.isFinite(n) && n >= 1 ? n : 1 });
          }}
          placeholder="e.g. 3"
          keyboardType="numeric"
        />
      </Field>

      <Field label="Tags" hint="Up to 10. Help creators find this campaign in search.">
        <TextField
          value={tagDraft}
          onChangeText={setTagDraft}
          placeholder="Type a tag and press add"
          autoCapitalize="none"
        />
        {tagDraft.trim().length > 0 && (
          <Pressable onPress={addTag} style={{ marginTop: 8 }}>
            <TagChip label={`Add "${tagDraft.trim().replace(/^#/, '')}"`} icon="plus" selected onPress={addTag} />
          </Pressable>
        )}
        {value.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {value.tags.map((t) => (
              <Pressable key={t} onPress={() => removeTag(t)}>
                <TagChip label={`#${t}`} icon="x" />
              </Pressable>
            ))}
          </View>
        )}
      </Field>
    </ScrollView>
  );
}
