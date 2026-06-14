/**
 * Creator portfolio image grid (PRD §7.2 onboarding, §7.3 profile). A 3-column
 * grid of cached thumbnails (max 6 per PRD §7.2). In `editable` mode it shows a
 * remove affordance per tile and an "add" tile until the cap is reached.
 */
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { RemoteImage } from '@/components/ui/RemoteImage';
import type { PortfolioItem } from '@/types';
import { Icon } from '@/components/ui';

const MAX_ITEMS = 6;
const COLUMNS = 3;
const GAP = 8;

export type PortfolioGridProps = {
  items: PortfolioItem[];
  /** Tap a tile (e.g. open full-screen / the linked post). */
  onPressItem?: (item: PortfolioItem, index: number) => void;
  /** Edit mode — show remove buttons + an add tile. */
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
};

export function PortfolioGrid({ items, onPressItem, editable, onAdd, onRemove }: PortfolioGridProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const tile = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const canAdd = editable && items.length < MAX_ITEMS;

  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {tile > 0 &&
        items.map((item, i) => (
          <Pressable
            key={`${item.imageUrl}-${i}`}
            onPress={onPressItem ? () => onPressItem(item, i) : undefined}
            style={{ width: tile, height: tile, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardSunk }}
          >
            <RemoteImage source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} recyclingKey={item.imageUrl} />
            {editable && (
              <Pressable
                onPress={() => onRemove?.(i)}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(20,20,30,0.7)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="x" size={14} color="#fff" strokeWidth={2.2} />
              </Pressable>
            )}
          </Pressable>
        ))}

      {tile > 0 && canAdd && (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => ({
            width: tile,
            height: tile,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.hairStrong,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.cardSunk,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="plus" size={22} color={colors.text3} strokeWidth={2} />
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: 4 }}>Add</Text>
        </Pressable>
      )}
    </View>
  );
}
