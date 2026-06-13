/**
 * Toast host (PRD §8.5 — toast on network errors). Mounted once at the root; it
 * subscribes to the `lib/toast` bus and shows a single animated toast pinned above
 * the bottom safe area, auto-dismissing after its duration. A new toast replaces
 * the current one, so a burst (e.g. several failed requests) collapses to the
 * latest rather than stacking. Tap to dismiss early.
 *
 * The shimmer/animation runs on the UI thread via Reanimated, matching the rest of
 * the app's motion. Colors come from `useTheme()` so it reads right in light/dark.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { subscribeToast, type ToastEvent, type ToastType } from '@/lib/toast';
import { Icon, type IconName } from './Icon';

const ICONS: Record<ToastType, IconName> = {
  error: 'alert',
  success: 'checkcircle',
  info: 'info',
};

export function ToastHost() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(24, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setToast)(null);
    });
  }, [opacity, translateY]);

  // Subscribe the single host to the bus for this mount.
  useEffect(() => {
    subscribeToast((event) => setToast(event));
    return () => subscribeToast(null);
  }, []);

  // Animate a new toast in and (re)start its auto-dismiss timer.
  useEffect(() => {
    if (!toast) return;
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, toast.duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, hide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const tone =
    toast.type === 'error' ? colors.danger : toast.type === 'success' ? colors.success : colors.accent;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 16,
          alignItems: 'center',
          paddingHorizontal: 16,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={hide}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          maxWidth: 480,
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.hair,
          paddingVertical: 12,
          paddingHorizontal: 14,
          ...shadows.cardStrong,
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: `${tone}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={ICONS[toast.type]} size={16} color={tone} strokeWidth={1.9} />
        </View>
        <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text }}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
