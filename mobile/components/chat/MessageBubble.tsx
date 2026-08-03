/**
 * One chat message bubble: outgoing bubbles are a brand-blue gradient on the right
 * with a small tail on the bottom-right corner; incoming sit left on the card
 * surface with a hairline border and a bottom-left tail. Consecutive messages from
 * the same sender are tightened into a group. The clock + delivery ticks sit inline
 * at the bottom-right; ticks stay grey/white when only delivered and turn a bright
 * blue-white once actually read. Also exports a small animated typing bubble, plus
 * the shared blue verified check + gradient avatar used across the chat surface.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { Icon, RemoteImage } from '@/components/ui';
import { initials as toInitials } from '@/lib/utils';
import type { Message } from '@/types';
import { shortTime } from './time';
import { OUT_GRADIENT, useChatPalette } from './chatTheme';

export function MessageBubble({
  message,
  mine,
  tight = false,
}: {
  message: Message;
  mine: boolean;
  /** Same sender as the message just above — tighten the vertical spacing. */
  tight?: boolean;
}) {
  const p = useChatPalette();

  const hasImage = typeof message.imageUrl === 'string' && message.imageUrl.length > 0;
  const hasText = typeof message.body === 'string' && message.body.trim().length > 0;
  // Image-only bubbles hug the image (minimal padding); a text/mixed bubble keeps
  // the roomier chat padding.
  const padH = hasImage && !hasText ? 4 : 13;
  const padTop = hasImage ? 4 : 8;

  const meta = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end', marginTop: 2, paddingRight: hasImage && !hasText ? 9 : 0, paddingBottom: hasImage && !hasText ? 2 : 0 }}>
      <Text style={{ fontSize: 10.5, color: mine ? p.metaOut : p.metaIn }}>{shortTime(message.createdAt)}</Text>
      {mine ? (
        // ✓ sent · ✓✓ delivered (grey/white) · ✓✓ read (blue) — colour never lies.
        <Text style={{ fontSize: 11, fontWeight: '700', color: message.readAt ? p.tickOutRead : p.tickOut }}>
          {message.readAt || message.deliveredAt ? '✓✓' : '✓'}
        </Text>
      ) : null}
    </View>
  );

  const content = (
    <>
      {hasImage ? <ChatImage uri={message.imageUrl as string} /> : null}
      {hasText ? (
        <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? p.outText : p.inText, marginTop: hasImage ? 6 : 0 }}>
          {message.body}
        </Text>
      ) : null}
      {meta}
    </>
  );

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', paddingHorizontal: 10, marginTop: tight ? 2 : 8 }}>
      {mine ? (
        <LinearGradient
          colors={OUT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            maxWidth: '80%',
            borderRadius: 17,
            borderBottomRightRadius: 5,
            paddingHorizontal: padH,
            paddingTop: padTop,
            paddingBottom: 6,
            shadowColor: p.accent,
            shadowOpacity: p.isDark ? 0 : 0.28,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={{
            maxWidth: '80%',
            backgroundColor: p.inBg,
            borderWidth: 1,
            borderColor: p.inBorder,
            borderRadius: 17,
            borderBottomLeftRadius: 5,
            paddingHorizontal: padH,
            paddingTop: padTop,
            paddingBottom: 6,
          }}
        >
          {content}
        </View>
      )}
    </View>
  );
}

/**
 * Image attached to a chat message. Sized to a fixed chat width with the natural
 * aspect ratio preserved (learned from the first onLoad; a 4:3 default keeps the
 * bubble from jumping before the bytes arrive). Top corners are rounded to match
 * the bubble; a broken URL just leaves the blur-up placeholder from RemoteImage.
 */
function ChatImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <RemoteImage
      source={{ uri }}
      contentFit="cover"
      onLoad={(e) => {
        const { width, height } = e.source ?? {};
        if (width && height) setRatio(width / height);
      }}
      style={{
        width: 220,
        aspectRatio: ratio,
        borderRadius: 6,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
      }}
    />
  );
}

/** Small blue circle with a white check — the "official account" verified mark. */
export function VerifiedCheck({ size = 15 }: { size?: number }) {
  const p = useChatPalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="check" size={Math.round(size * 0.62)} color="#fff" strokeWidth={3.4} />
    </View>
  );
}

/** Round gradient avatar with initials — used for the official support identity. */
export function GradientAvatar({ name, size = 38 }: { name?: string; size?: number }) {
  return (
    <LinearGradient
      colors={OUT_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36, letterSpacing: 0.3 }}>
        {toInitials(name ?? '') || 'LC'}
      </Text>
    </LinearGradient>
  );
}

/** Animated "•••" typing bubble shown on the incoming side. */
export function TypingBubble() {
  const p = useChatPalette();
  return (
    <View style={{ alignItems: 'flex-start', paddingHorizontal: 10, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p.inBg, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11 }}>
        <Dot i={0} color={p.metaIn} />
        <Dot i={1} color={p.metaIn} />
        <Dot i={2} color={p.metaIn} />
      </View>
    </View>
  );
}

function Dot({ i, color }: { i: number; color: string }) {
  const reduced = useReducedMotion();
  // Each dot eases 0.3↔1 on a reversing loop, staggered by index — no modulo
  // wraparound (which caused a visible snap), so it pulses smoothly.
  const v = useSharedValue(0.3);
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(i * 160, withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(v);
  }, [v, reduced, i]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: -3 * (v.value - 0.3) }] }));
  return <Reanimated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }, style]} />;
}
