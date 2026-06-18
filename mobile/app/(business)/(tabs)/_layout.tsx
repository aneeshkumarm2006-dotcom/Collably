/**
 * Business bottom tabs (PRD §4.1, §7.4): Home · Campaigns · Applications · Chats · Profile.
 * Phase 13 builds each tab's content.
 */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';
import { useChatStore } from '@/store/chatStore';

export default function BusinessTabsLayout() {
  const { colors } = useTheme();
  const unread = useChatStore((s) => s.totalUnread);

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
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="applications" options={{ title: 'Applications', tabBarIcon: icon('inbox') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: icon('message'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('store') }} />
    </Tabs>
  );
}
