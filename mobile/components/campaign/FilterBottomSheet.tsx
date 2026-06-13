/**
 * Discovery filter sheet (PRD §13). Presents chip rows for category, reward type,
 * platform, and follower bucket, plus a remote-only toggle. Edits a local draft so
 * nothing applies until the user taps Apply; "Clear all" resets to empty.
 *
 * Controlled by a `BottomSheetRef`:
 *   const ref = useRef<BottomSheetRef>(null);
 *   <FilterBottomSheet ref={ref} value={filters} onApply={setFilters} />
 *   ref.current?.present();
 */
import { forwardRef, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { CATEGORIES, REWARD_TYPES, PLATFORMS } from '@/constants';
import { BottomSheet, type BottomSheetRef, Button, TagChip } from '@/components/ui';
import {
  FOLLOWER_BUCKETS,
  FOLLOWER_BUCKET_LABEL,
  countActiveFilters,
  type CampaignFilters,
} from './filterTypes';

export type FilterBottomSheetProps = {
  value: CampaignFilters;
  onApply: (next: CampaignFilters) => void;
};

export const FilterBottomSheet = forwardRef<BottomSheetRef, FilterBottomSheetProps>(function FilterBottomSheet(
  { value, onApply },
  ref,
) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<CampaignFilters>(value);

  // Re-sync the draft whenever the sheet is re-opened with new external filters.
  useEffect(() => setDraft(value), [value]);

  /** Toggle a single-select field: tapping the active value clears it. */
  function toggle<K extends keyof CampaignFilters>(key: K, val: CampaignFilters[K]) {
    setDraft((d) => ({ ...d, [key]: d[key] === val ? undefined : val }));
  }

  const apply = () => {
    onApply(draft);
    (ref as React.RefObject<BottomSheetRef>)?.current?.dismiss();
  };
  const clear = () => setDraft({});
  const activeCount = countActiveFilters(draft);

  return (
    <BottomSheet ref={ref} title="Filters" snapPoints={['85%']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <Group label="Category" colors={colors}>
          {CATEGORIES.map((c) => (
            <TagChip key={c} label={c} selected={draft.category === c} onPress={() => toggle('category', c)} />
          ))}
        </Group>

        <Group label="Reward type" colors={colors}>
          {REWARD_TYPES.map((r) => (
            <TagChip key={r} label={r} selected={draft.rewardType === r} onPress={() => toggle('rewardType', r)} />
          ))}
        </Group>

        <Group label="Platform" colors={colors}>
          {PLATFORMS.map((p) => (
            <TagChip key={p} label={p} selected={draft.platform === p} onPress={() => toggle('platform', p)} />
          ))}
        </Group>

        <Group label="Audience size" colors={colors}>
          {FOLLOWER_BUCKETS.map((b) => (
            <TagChip
              key={b}
              label={FOLLOWER_BUCKET_LABEL[b]}
              selected={(draft.followersBucket ?? 'any') === b}
              onPress={() => toggle('followersBucket', b === 'any' ? undefined : b)}
            />
          ))}
        </Group>

        <Group label="Location" colors={colors}>
          <TagChip
            label="Remote / Online only"
            icon="compass"
            selected={!!draft.remoteOnly}
            onPress={() => setDraft((d) => ({ ...d, remoteOnly: d.remoteOnly ? undefined : true }))}
          />
        </Group>
      </ScrollView>

      {/* footer actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.hair,
        }}
      >
        <Button variant="outline" onPress={clear}>
          Clear all
        </Button>
        <View style={{ flex: 1 }}>
          <Button block variant="solid" onPress={apply}>
            {activeCount > 0 ? `Apply (${activeCount})` : 'Apply'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});

function Group({ label, colors, children }: { label: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 10, letterSpacing: -0.1 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}
