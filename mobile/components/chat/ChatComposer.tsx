/**
 * Message input row: a growing multiline field + a send button. Owns its own draft
 * text; reports typing changes (for the typing indicator) and hands the trimmed
 * body to `onSend`.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';

export function ChatComposer({
  onSend,
  onTyping,
}: {
  onSend: (body: string) => void;
  onTyping?: (typing: boolean) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const send = () => {
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onTyping?.(false);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.hair,
        backgroundColor: colors.bgElev,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hair,
          borderRadius: 20,
          paddingHorizontal: 14,
          maxHeight: 120,
          justifyContent: 'center',
        }}
      >
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onTyping?.(t.trim().length > 0);
          }}
          placeholder="Message…"
          placeholderTextColor={colors.text3}
          multiline
          style={{ fontSize: 15, color: colors.text, paddingTop: 9, paddingBottom: 9 }}
        />
      </View>
      <Pressable
        onPress={send}
        disabled={!trimmed}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: trimmed ? colors.accent : colors.hairStrong,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: trimmed ? 1 : 0.6,
        }}
      >
        <Icon name="arrowR" size={20} color={colors.accentText} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
