/** "or" divider between the email form and the Google button (PRD §7.1). */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { useOnDarkSurface } from '@/components/ui';

export function OrDivider({ label = 'or' }: { label?: string }) {
  const { colors } = useTheme();
  const onDark = useOnDarkSurface();
  const hair = onDark ? 'rgba(255,255,255,0.12)' : colors.hair;
  const labelColor = onDark ? 'rgba(255,255,255,0.5)' : colors.text3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: hair }} />
      <Text style={{ marginHorizontal: 12, fontSize: 13, color: labelColor, fontWeight: '500' }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: hair }} />
    </View>
  );
}
