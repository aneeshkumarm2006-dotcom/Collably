/**
 * Creator bottom tabs (PRD §4.1, §7.3): Home · Explore · Collabs · Chats · Profile.
 * Tab styling/colors come from the runtime theme so light/dark stay in sync; the
 * glyphs come from `components/nav/TabIcon` (Phosphor, filled when selected).
 * Phase 12 builds each tab's content.
 */
import { Tabs } from 'expo-router';
import { ChatCircle, Compass, Handshake, House, User } from 'phosphor-react-native';
import { useTheme } from '@/components/ThemeProvider';
import { useTabBarStyle } from '@/components/nav/useTabBarStyle';
import { tabIcon } from '@/components/nav/TabIcon';
import { useChatStore } from '@/store/chatStore';

export default function CreatorTabsLayout() {
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
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: tabIcon(Compass) }} />
      <Tabs.Screen name="collabs" options={{ title: 'Collabs', tabBarIcon: tabIcon(Handshake) }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: tabIcon(ChatCircle),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(User) }} />
    </Tabs>
  );
}
