/**
 * Sort sheet for the explore feed (PRD §13). A single-select radio list of sort
 * options; selecting one applies immediately and closes the sheet. "Recommended"
 * is only meaningful for logged-in creators (the API ranks by niche/location), so
 * pass `allowRelevance={false}` for guests to hide it.
 */
import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { BottomSheet, type BottomSheetRef, Icon } from '@/components/ui';
import { CAMPAIGN_SORTS, CAMPAIGN_SORT_LABEL, type CampaignSort } from './filterTypes';

export type SortBottomSheetProps = {
  value: CampaignSort;
  onChange: (next: CampaignSort) => void;
  /** Hide "Recommended for you" for guests (no personalization). */
  allowRelevance?: boolean;
};

export const SortBottomSheet = forwardRef<BottomSheetRef, SortBottomSheetProps>(function SortBottomSheet(
  { value, onChange, allowRelevance = true },
  ref,
) {
  const { colors } = useTheme();
  const options = CAMPAIGN_SORTS.filter((s) => allowRelevance || s !== 'relevance');

  const select = (s: CampaignSort) => {
    onChange(s);
    (ref as React.RefObject<BottomSheetRef>)?.current?.dismiss();
  };

  return (
    <BottomSheet ref={ref} title="Sort by">
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        {options.map((s) => {
          const active = s === value;
          return (
            <Pressable
              key={s}
              onPress={() => select(s)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: active ? colors.accentSoft : pressed ? colors.cardSunk : 'transparent',
              })}
            >
              <Text style={{ fontSize: 15.5, fontWeight: active ? '600' : '500', color: active ? colors.accent : colors.text }}>
                {CAMPAIGN_SORT_LABEL[s]}
              </Text>
              {active && <Icon name="check" size={20} color={colors.accent} strokeWidth={2.2} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
});
