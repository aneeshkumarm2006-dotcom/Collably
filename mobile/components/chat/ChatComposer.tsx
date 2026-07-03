/**
 * Message input row, WhatsApp-premium: a rounded pill with an attach affordance +
 * a growing multiline field, and a green circular send button. Owns its own draft
 * text; reports typing changes (for the typing indicator) and hands the trimmed
 * body to `onSend`.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Icon } from '@/components/ui';
import { showToast } from '@/lib/toast';
import { useChatPalette } from './chatTheme';

export function ChatComposer({
  onSend,
  onTyping,
  bottomInset = 0,
}: {
  onSend: (body: string) => void;
  onTyping?: (typing: boolean) => void;
  /** Extra bottom padding (home-indicator clearance when the keyboard is down). */
  bottomInset?: number;
}) {
  const p = useChatPalette();
  const { colors } = p;
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
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 8 + bottomInset,
        backgroundColor: p.chatBg,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.card,
          borderWidth: p.isDark ? 0 : 1,
          borderColor: colors.hair,
          borderRadius: 24,
          paddingLeft: 12,
          paddingRight: 6,
          maxHeight: 130,
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
          style={{ flex: 1, fontSize: 15.5, color: colors.text, paddingTop: 9, paddingBottom: 9 }}
        />
        <Pressable
          onPress={() => showToast({ message: 'Attachments coming soon.', type: 'info' })}
          accessibilityLabel="Attach"
          hitSlop={6}
          style={{ paddingVertical: 6 }}
        >
          <Icon name="plus" size={22} color={colors.text3} strokeWidth={2} />
        </Pressable>
      </View>
      <Pressable
        onPress={send}
        disabled={!trimmed}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          width: 46,
          height: 46,
          borderRadius: 999,
          backgroundColor: p.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: trimmed ? 1 : 0.55,
          shadowColor: '#000',
          shadowOpacity: p.isDark ? 0 : 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        <Icon name="arrowR" size={21} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
