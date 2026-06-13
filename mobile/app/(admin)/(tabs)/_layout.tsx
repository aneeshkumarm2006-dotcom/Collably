/**
 * Admin bottom tabs (PRD §4.1, §7.5): Dashboard · Users · Campaigns · Reports.
 * Phase 14 builds each tab's content.
 */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';

export default function AdminTabsLayout() {
  const { colors } = useTheme();

  const icon =
    (name: IconName) =>
    ({ color, size }: { color: ColorValue; size: number }) => (
      <Icon name={name} color={color as string} size={size} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.hair },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: icon('flag') }} />
    </Tabs>
  );
}
