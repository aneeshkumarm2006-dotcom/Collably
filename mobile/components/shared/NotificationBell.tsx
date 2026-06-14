/**
 * Bell button with an unread-count badge, driven by `notificationStore` (PRD §8.2,
 * §15). Drop into a Header `right` slot; tapping routes to the notifications screen.
 * The badge hides at zero and caps the display at "9+".
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { useNotificationStore } from '@/store/notificationStore';
import { Icon } from '@/components/ui';

export type NotificationBellProps = {
  onPress?: () => void;
  /** Icon color override (defaults to the header's primary text color). */
  color?: string;
  size?: number;
};

export function NotificationBell({ onPress, color, size = 22 }: NotificationBellProps) {
  const { colors } = useTheme();
  const unread = useNotificationStore((s) => s.unreadCount);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={8}
      style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="bell" size={size} color={color ?? colors.text} strokeWidth={1.8} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.bg,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}
