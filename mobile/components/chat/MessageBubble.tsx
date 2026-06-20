/**
 * One chat message bubble, WhatsApp-style: outgoing bubbles are the green fill on
 * the right with a top tail; incoming sit left on white/ink. Consecutive messages
 * from the same sender are tightened into a group (tail only on the first of the
 * run). The clock + delivery ticks sit inline at the bottom-right; read ticks turn
 * blue. Also exports a small animated typing bubble.
 */
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Reanimated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import type { Message } from '@/types';
import { shortTime } from './time';
import { useChatPalette } from './chatTheme';

export function MessageBubble({
  message,
  mine,
  tight = false,
}: {
  message: Message;
  mine: boolean;
  /** Same sender as the message just above — tighten spacing, drop the tail. */
  tight?: boolean;
}) {
  const p = useChatPalette();
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', paddingHorizontal: 10, marginTop: tight ? 2 : 8 }}>
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: mine ? p.outBg : p.inBg,
          borderRadius: 14,
          borderTopRightRadius: mine && !tight ? 4 : 14,
          borderTopLeftRadius: !mine && !tight ? 4 : 14,
          paddingHorizontal: 10,
          paddingTop: 6,
          paddingBottom: 5,
          shadowColor: '#000',
          shadowOpacity: p.isDark ? 0 : 0.06,
          shadowRadius: 1,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? p.outText : p.inText }}>{message.body}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end', marginTop: 1 }}>
          <Text style={{ fontSize: 10.5, color: mine ? p.metaOut : p.metaIn }}>{shortTime(message.createdAt)}</Text>
          {mine ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: message.readAt ? p.tickOutRead : p.tickOut }}>
              {message.readAt ? '✓✓' : '✓'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
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
