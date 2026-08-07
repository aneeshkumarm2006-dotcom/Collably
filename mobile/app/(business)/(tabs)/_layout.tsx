/**
 * Business bottom tabs (PRD §4.1, §7.4): Home · Campaigns · Applications · Chats · Profile.
 * Glyphs come from `components/nav/TabIcon` (Phosphor, filled when selected) so this
 * bar and the creator bar stay identical. Phase 13 builds each tab's content.
 */
import { Tabs } from 'expo-router';
import { Briefcase, ChatCircle, House, Storefront, Tray } from 'phosphor-react-native';
import { useTheme } from '@/components/ThemeProvider';
import { useTabBarStyle } from '@/components/nav/useTabBarStyle';
import { tabIcon } from '@/components/nav/TabIcon';
import { useChatStore } from '@/store/chatStore';

export default function BusinessTabsLayout() {
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();
  const unread = useChatStore((s) => s.totalUnread);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: tabIcon(Briefcase) }} />
      <Tabs.Screen name="applications" options={{ title: 'Applications', tabBarIcon: tabIcon(Tray) }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: tabIcon(ChatCircle),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(Storefront) }} />
    </Tabs>
  );
}
