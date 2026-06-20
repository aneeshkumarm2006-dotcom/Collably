/**
 * One row in the conversations list — WhatsApp-premium: avatar, name + time on top,
 * a one-line preview (prefixed with a ✓/✓✓ tick when you sent the last message),
 * the collab it's about as a subtle chip, and a green unread pill. Unread rows get
 * bolder text + a brighter timestamp.
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { Avatar, Icon } from '@/components/ui';
import type { Conversation } from '@/types';
import { relativeStamp } from './time';
import { useChatPalette } from './chatTheme';

export function ConversationRow({
  conversation,
  mineId,
  onPress,
}: {
  conversation: Conversation;
  /** The viewer's user id — to show ticks on threads where they sent last. */
  mineId?: string;
  onPress: () => void;
}) {
  const p = useChatPalette();
  const { colors } = p;
  const other = conversation.otherParticipant;
  const unread = conversation.unreadCount ?? 0;
  const hasUnread = unread > 0;
  const sentLast = !!mineId && conversation.lastSenderUserId === mineId;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingHorizontal: 16,
        paddingVertical: 11,
        backgroundColor: pressed ? colors.cardSunk : 'transparent',
      })}
    >
      <Avatar src={other?.avatar} name={other?.name} size={54} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: hasUnread ? '800' : '600', color: colors.text, letterSpacing: -0.2 }}>
            {other?.name ?? 'Conversation'}
          </Text>
          {!!conversation.lastMessageAt && (
            <Text style={{ fontSize: 12, fontWeight: hasUnread ? '800' : '500', color: hasUnread ? p.accentDeep : colors.text3 }}>
              {relativeStamp(conversation.lastMessageAt)}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {sentLast && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: p.accent }}>✓✓</Text>
          )}
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 13.5, color: hasUnread ? colors.text : colors.text2, fontWeight: hasUnread ? '600' : '400' }}
          >
            {conversation.lastMessage ?? 'Say hello 👋'}
          </Text>
          {hasUnread && (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>

        {!!conversation.campaignTitle && (
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 6, backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Icon name="briefcase" size={10} color={colors.accent} strokeWidth={2.2} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.accent, maxWidth: 200 }}>
              {conversation.campaignTitle}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
