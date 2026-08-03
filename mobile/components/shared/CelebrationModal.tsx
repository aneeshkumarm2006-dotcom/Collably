/**
 * App-wide "Hurray" celebration popup. Mounted once in the root layout; shows
 * whenever {@link useCelebrationStore} holds a payload (set on an approval/verify
 * event — see `useNotificationSocket` and the push-tap handler). A confetti burst
 * rains over a centered card with the headline + message and a single dismiss CTA.
 */
import { Modal, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { Confetti, Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useCelebrationStore } from '@/store/celebrationStore';

export function CelebrationModal() {
  const { colors } = useTheme();
  const current = useCelebrationStore((s) => s.current);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  const reduced = useReducedMotion();
  // The card lands with a spring (rise + settle); reduce-motion gets a plain fade.
  const cardEnter = reduced ? FadeIn.duration(220) : FadeInDown.springify().damping(16).stiffness(190).mass(0.9);

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,8,14,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Confetti rains over the whole screen, above the scrim, below the card taps. */}
        {current ? <Confetti /> : null}

        <Reanimated.View
          entering={cardEnter}
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.card,
            borderRadius: 26,
            paddingHorizontal: 26,
            paddingTop: 30,
            paddingBottom: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          {/* Premium verified-check badge: a blue gradient disc with a white check,
              cradled in a soft halo, springing in. No emoji, no sparkle. */}
          <Reanimated.View
            entering={reduced ? FadeIn.duration(220) : ZoomIn.springify().damping(12).stiffness(180).delay(120)}
            style={{
              width: 98,
              height: 98,
              borderRadius: 49,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              backgroundColor: colors.brandGreenSoft,
            }}
          >
            <LinearGradient
              colors={[colors.brandGreen, colors.brandGreenDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.brandGreen,
                shadowOpacity: 0.55,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <Icon name="check" size={38} color="#fff" strokeWidth={3.5} />
            </LinearGradient>
          </Reanimated.View>

          <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: colors.text, textAlign: 'center' }}>
            {current?.title ?? ''}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text2, textAlign: 'center', marginTop: 10 }}>
            {current?.message ?? ''}
          </Text>

          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [{ width: '100%', marginTop: 24 }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 }]}
          >
            <LinearGradient
              colors={[colors.brandGreen, colors.brandGreenDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', letterSpacing: -0.3, color: '#fff' }}>Let’s go</Text>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
