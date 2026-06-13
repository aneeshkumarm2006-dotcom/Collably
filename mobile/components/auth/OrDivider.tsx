/** "or" divider between the email form and the Google button (PRD §7.1). */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';

export function OrDivider({ label = 'or' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
      <Text style={{ marginHorizontal: 12, fontSize: 13, color: colors.text3, fontWeight: '500' }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
    </View>
  );
}
