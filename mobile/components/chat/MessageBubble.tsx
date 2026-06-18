/**
 * One chat message bubble. `mine` aligns it right with the accent fill; the other
 * party's messages sit left on a card surface. Sent messages show a single tick,
 * double once read by the recipient.
 */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import type { Message } from '@/types';
import { shortTime } from './time';

export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: mine ? 'flex-end' : 'flex-start',
        paddingHorizontal: 12,
        marginVertical: 3,
      }}
    >
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: mine ? colors.accent : colors.card,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.hair,
          borderRadius: 16,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          paddingHorizontal: 13,
          paddingTop: 8,
          paddingBottom: 6,
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? colors.accentText : colors.text }}>
          {message.body}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 }}>
          <Text
            style={{
              fontSize: 10.5,
              color: mine ? colors.accentText : colors.text3,
              opacity: mine ? 0.85 : 1,
            }}
          >
            {shortTime(message.createdAt)}
          </Text>
          {mine && (
            <Text style={{ fontSize: 10.5, color: colors.accentText, opacity: 0.85 }}>
              {message.readAt ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
