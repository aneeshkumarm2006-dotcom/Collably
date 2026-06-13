/**
 * Creator bottom tabs (PRD §4.1, §7.3): Home · Explore · Collabs · Profile.
 * Tab styling/colors come from the runtime theme so light/dark stay in sync; tab
 * glyphs use the app's `Icon` set. Phase 12 builds each tab's content.
 */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';

export default function CreatorTabsLayout() {
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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="collabs" options={{ title: 'Collabs', tabBarIcon: icon('handshake') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
