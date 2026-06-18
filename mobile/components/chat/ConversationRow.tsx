/**
 * One row in the conversations list: the other participant's avatar + name, the
 * campaign it's about, the last-message preview, a relative timestamp, and an
 * unread badge.
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { Avatar } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import type { Conversation } from '@/types';
import { relativeStamp } from './time';

export function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const other = conversation.otherParticipant;
  const unread = conversation.unreadCount ?? 0;
  const hasUnread = unread > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Avatar src={other?.avatar} name={other?.name} size={50} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 15.5, fontWeight: hasUnread ? '800' : '600', color: colors.text }}
          >
            {other?.name ?? 'Conversation'}
          </Text>
          {!!conversation.lastMessageAt && (
            <Text style={{ fontSize: 11.5, color: hasUnread ? colors.accent : colors.text3 }}>
              {relativeStamp(conversation.lastMessageAt)}
            </Text>
          )}
        </View>
        {!!conversation.campaignTitle && (
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: colors.text3, marginTop: 1 }}>
            {conversation.campaignTitle}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 13.5,
              color: hasUnread ? colors.text : colors.text2,
              fontWeight: hasUnread ? '600' : '400',
            }}
          >
            {conversation.lastMessage ?? 'Say hello 👋'}
          </Text>
          {hasUnread && (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                paddingHorizontal: 6,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentText }}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
