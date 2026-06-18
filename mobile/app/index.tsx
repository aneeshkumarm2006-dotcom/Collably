/**
 * Boot splash (Phase 9) — the CollabSpace brand splash from the design handoff.
 *
 * `/` is the initial route. The native splash stays up until the root layout has
 * loaded fonts + hydrated the session; the auth gate then `replace()`s into the
 * correct route group. This screen shows in the brief window between splash hide
 * and that redirect, so it mirrors the design's `Splash`: a yellow brand wash, the
 * CollabSpace lockup, and a "LOCAL COLLAB MARKETPLACE" caption — no flash of the
 * wrong content, no decisions of its own.
 */
import { ActivityIndicator, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/ThemeProvider';
import { BrandMark } from '@/components/shared/BrandMark';

const INK = '#FFFFFF';

export default function BootScreen() {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.brandYellow, colors.brandYellowDeep]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <BrandMark size={56} wordmark color={INK} wordmarkColor={INK} bg={colors.brandYellow} />

      <View style={{ position: 'absolute', bottom: 72, alignItems: 'center', gap: 14 }}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
        <Text style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.4, color: 'rgba(255,255,255,0.62)', fontWeight: '600' }}>
          LOCAL COLLAB MARKETPLACE
        </Text>
      </View>
    </LinearGradient>
  );
}
