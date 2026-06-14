/**
 * Appearance picker for the Settings screen — a System / Light / Dark segmented
 * control wired to the persisted theme-mode store. Mirrors the design's Light/Dark
 * switch, with an added "System" option to follow the OS.
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

const OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'system', label: 'System', icon: 'gear' },
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
];

export function ThemeModeRow() {
  const { colors, shadows } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 14,
        padding: 6,
      }}
    >
      <View style={{ flexDirection: 'row', backgroundColor: colors.cardSunk, borderRadius: 12, padding: 4, gap: 4 }}>
        {OPTIONS.map((o) => {
          const active = mode === o.mode;
          return (
            <Pressable
              key={o.mode}
              onPress={() => setMode(o.mode)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderRadius: 9,
                backgroundColor: active ? colors.card : 'transparent',
                ...(active ? shadows.card : null),
              }}
            >
              <Icon name={o.icon} size={15} color={active ? colors.accent : colors.text3} strokeWidth={2} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: active ? colors.text : colors.text3 }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
