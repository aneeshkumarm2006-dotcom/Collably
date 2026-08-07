/**
 * Message input row, WhatsApp-premium: a rounded pill with an attach affordance +
 * a growing multiline field, and a green circular send button. Reports typing changes
 * (for the typing indicator) and hands the trimmed body (and/or an uploaded image URL)
 * to `onSend`.
 *
 * The draft text lives in `chatStore`, keyed by conversation, NOT in local state.
 * This screen unmounts when you navigate back, so a `useState` draft was silently
 * destroyed every time you left a thread mid-sentence. The store outlives navigation,
 * so the text is still there when you return.
 *
 * The attach button picks a photo, compresses + uploads it to Cloudinary via the
 * shared `pickAndUploadImage` helper (signed upload → `secure_url`), then sends it
 * as an image message — optionally carrying the typed text as a caption. The button
 * shows a spinner while the upload is in flight and is disabled so you can't fire a
 * second pick mid-upload.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Icon } from '@/components/ui';
import { showToast } from '@/lib/toast';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useChatStore } from '@/store/chatStore';
import { useChatPalette } from './chatTheme';

export function ChatComposer({
  conversationId,
  onSend,
  onTyping,
  bottomInset = 0,
}: {
  /** Which thread's draft to read and write. */
  conversationId: string;
  /** Send a text message, an image, or an image with a caption. */
  onSend: (payload: { body?: string; imageUrl?: string }) => void;
  onTyping?: (typing: boolean) => void;
  /** Extra bottom padding (home-indicator clearance when the keyboard is down). */
  bottomInset?: number;
}) {
  const p = useChatPalette();
  const { colors } = p;
  const text = useChatStore((s) => s.drafts[conversationId] ?? '');
  const setDraft = useChatStore((s) => s.setDraft);
  const [uploading, setUploading] = useState(false);
  const trimmed = text.trim();

  const onChange = useCallback(
    (t: string) => {
      setDraft(conversationId, t);
      onTyping?.(t.trim().length > 0);
    },
    [conversationId, setDraft, onTyping],
  );

  const send = () => {
    if (!trimmed) return;
    // `sendMessage` clears the draft itself (and restores it if the send fails),
    // so don't clear it here or a failed send loses the text anyway.
    onSend({ body: trimmed });
    onTyping?.(false);
  };

  const attach = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      // Chat photos land in the shared "submissions" folder (same as the admin
      // support chat). Portrait-friendly: no forced crop aspect.
      const imageUrl = await pickAndUploadImage('submissions');
      if (!imageUrl) return; // user cancelled the picker
      // Attach any typed text as the caption. `sendMessage` owns clearing the draft.
      const caption = text.trim();
      onSend({ imageUrl, ...(caption ? { body: caption } : {}) });
      onTyping?.(false);
    } catch (err) {
      const message =
        err instanceof ImagePermissionError
          ? err.message
          : 'Could not send that image. Please try again.';
      showToast({ message, type: 'error' });
    } finally {
      setUploading(false);
    }
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
          onChangeText={onChange}
          placeholder="Message…"
          placeholderTextColor={colors.text3}
          multiline
          style={{ flex: 1, fontSize: 15.5, color: colors.text, paddingTop: 9, paddingBottom: 9 }}
        />
        <Pressable
          onPress={attach}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Attach a photo"
          accessibilityState={{ disabled: uploading, busy: uploading }}
          hitSlop={6}
          style={{ paddingVertical: 6, opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.text3} />
          ) : (
            <Icon name="plus" size={22} color={colors.text3} strokeWidth={2} />
          )}
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
