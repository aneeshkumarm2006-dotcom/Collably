/**
 * App-wide in-app notification banner. Mounted once in the root layout, next to
 * {@link CelebrationModal}. Slides in from the top whenever
 * {@link useNotificationBannerStore} holds a payload — the lightweight, tasteful
 * counterpart to the confetti celebration modal.
 *
 * It fires for live `notification:new` events that are NOT celebration types
 * (see `useNotificationSocket`), so a new chat message or application update
 * surfaces something visible instead of silently bumping the bell badge. Tapping
 * it resolves the notification's role-neutral `deepLinkPath` into the signed-in
 * user's navigator and routes there; it also auto-dismisses after a few seconds.
 *
 * The outer container is `pointerEvents="box-none"` so it never swallows touches
 * meant for the screen underneath — only the banner card itself is interactive.
 */
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, FadeOut, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/SafePressable';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useNotificationBannerStore } from '@/store/notificationBannerStore';
import { resolveDeepLink } from '@/lib/deepLink';

/** How long the banner lingers before auto-dismissing. */
const AUTO_DISMISS_MS = 4000;

/** Chat/message notifications get the speech-bubble icon; everything else the bell. */
function iconForType(type?: string): IconName {
  if (type && (type.includes('message') || type.includes('chat'))) return 'message';
  return 'bell';
}

export function NotificationBanner() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const current = useNotificationBannerStore((s) => s.current);
  const dismiss = useNotificationBannerStore((s) => s.dismiss);
  const reduced = useReducedMotion();

  // Auto-dismiss timer. Re-armed for each new banner (keyed on id) and cleared on
  // unmount or when the banner changes, so a stale timer can't hide a newer one.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current?.id, dismiss]);

  if (!current) return null;

  const onPress = () => {
    const path = current.deepLinkPath;
    // Dismiss first so the banner is gone regardless of where we land.
    dismiss();
    if (path) router.push(resolveDeepLink(path, role));
  };

  const enter = reduced ? FadeIn.duration(200) : FadeInDown.springify().damping(18).stiffness(200).mass(0.9);
  const exit = reduced ? FadeOut.duration(160) : FadeOutUp.duration(220);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        right: 12,
      }}
    >
      <Reanimated.View entering={enter} exiting={exit}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={current.message}
          onPress={onPress}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingLeft: 14,
              paddingRight: 8,
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.hair,
            },
            shadows.cardStrong,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.97 },
          ]}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentSoft,
            }}
          >
            <Icon name={iconForType(current.type)} size={19} color={colors.accent} strokeWidth={1.9} />
          </View>

          <Text
            numberOfLines={2}
            style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 19, color: colors.text }}
          >
            {current.message}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            hitSlop={8}
            onPress={dismiss}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name="x" size={17} color={colors.text3} strokeWidth={2} />
          </Pressable>
        </Pressable>
      </Reanimated.View>
    </View>
  );
}
