/**
 * App-wide "Hurray" celebration popup. Mounted once in the root layout; shows
 * whenever {@link useCelebrationStore} holds a payload (set on an approval/verify
 * event — see `useNotificationSocket` and the push-tap handler). A confetti burst
 * rains over a centered card with the headline + message and a single dismiss CTA.
 */
import { Modal, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { Confetti, Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useCelebrationStore } from '@/store/celebrationStore';

export function CelebrationModal() {
  const { colors } = useTheme();
  const current = useCelebrationStore((s) => s.current);
  const dismiss = useCelebrationStore((s) => s.dismiss);

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,8,14,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Confetti rains over the whole screen, above the scrim, below the card taps. */}
        {current ? <Confetti /> : null}

        <View
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
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              backgroundColor: colors.brandGreenSoft,
            }}
          >
            <Icon name="sparkles" size={36} color={colors.brandGreenText} />
          </View>

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
        </View>
      </View>
    </Modal>
  );
}
