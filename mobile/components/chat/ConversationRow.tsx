/**
 * One row in the conversations list: avatar, a one-line name (with a blue verified
 * check for the official support thread), a one-line preview (prefixed with a ✓✓
 * delivery tick when you sent the last message), the collab it's about as a subtle
 * chip, and a fixed-width time/unread column so it never gets squeezed. Unread rows
 * get bolder text + a brighter timestamp.
 *
 * Tick honesty: the preview tick mirrors the thread bubble exactly. A single ✓ shows
 * when your last message is only sent (not yet on the recipient's device); it becomes
 * a GREY ✓✓ once `lastMessageDelivered` is true (delivered) and turns BLUE ✓✓ once
 * `lastReadByOther` is true (actually read). No fabricated delivered/read state.
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { Avatar, Icon } from '@/components/ui';
import { useChatStore } from '@/store/chatStore';
import type { Conversation } from '@/types';
import { relativeStamp } from './time';
import { useChatPalette } from './chatTheme';
import { VerifiedCheck } from './MessageBubble';

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
  const isOfficial = conversation.kind === 'admin';
  const sentLast = !!mineId && conversation.lastSenderUserId === mineId;
  const readByOther = conversation.lastReadByOther === true;
  // Delivered = the last message reached the recipient's device. Read implies
  // delivered, so treat a read receipt as delivered too — mirrors the bubble's
  // `readAt || deliveredAt ? '✓✓' : '✓'`.
  const deliveredToOther = readByOther || conversation.lastMessageDelivered === true;
  // Unsent text left in this thread's composer, if any.
  const draft = useChatStore((s) => s.drafts[conversation._id])?.trim();

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
      <Avatar src={other?.avatar} name={other?.name} size={52} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 16, fontWeight: hasUnread ? '800' : '600', color: colors.text, letterSpacing: -0.2 }}
          >
            {other?.name ?? 'Conversation'}
          </Text>
          {isOfficial && <VerifiedCheck size={15} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {draft ? (
            // An unsent draft outranks the last message in the preview — same as
            // WhatsApp. It's the only cue that you left something half-typed.
            <>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.danger }}>Draft:</Text>
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 13.5, color: colors.text2 }}
              >
                {draft}
              </Text>
            </>
          ) : (
            <>
              {sentLast && (
                // Single ✓ when only sent; grey ✓✓ once delivered; blue ✓✓ once read.
                <Text style={{ fontSize: 12, fontWeight: '700', color: readByOther ? p.rowTickRead : p.rowTickDelivered }}>
                  {deliveredToOther ? '✓✓' : '✓'}
                </Text>
              )}
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 13.5, color: hasUnread ? colors.text : colors.text2, fontWeight: hasUnread ? '600' : '400' }}
              >
                {conversation.lastMessage ?? 'Say hello 👋'}
              </Text>
            </>
          )}
        </View>

        {!!conversation.campaignTitle && !isOfficial && (
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 6, backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Icon name="briefcase" size={10} color={colors.accent} strokeWidth={2.2} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.accent, maxWidth: 200 }}>
              {conversation.campaignTitle}
            </Text>
          </View>
        )}
      </View>

      {/* Fixed-width right rail: time on top, unread badge below — never squeezed. */}
      <View style={{ width: 56, alignItems: 'flex-end', gap: 5 }}>
        {!!conversation.lastMessageAt && (
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: hasUnread ? '800' : '500', color: hasUnread ? p.accentDeep : colors.text3 }}>
            {relativeStamp(conversation.lastMessageAt)}
          </Text>
        )}
        {hasUnread && (
          <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
