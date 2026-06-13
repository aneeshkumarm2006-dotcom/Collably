/**
 * Welcome / landing screen (PRD §7.1).
 *
 * The entry point for unauthenticated users: brand mark, tagline, a short "how it
 * works" explainer, and the four entry CTAs. Each CTA drives a real navigation /
 * state transition the root auth gate reacts to:
 *   - Join as Business / Creator → signup (role pre-selected via `?role=`)
 *   - Browse Campaigns          → guest mode (PRD §8.6) → creator explore
 *   - Log in                    → login
 */
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeProvider';
import { Button, Icon, type IconName } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

/** The three-step pitch shown under the brand mark. */
const HOW_IT_WORKS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'compass',
    title: 'Discover campaigns',
    body: 'Brands post gifting collabs. Creators browse and apply in seconds.',
  },
  {
    icon: 'handshake',
    title: 'Get matched',
    body: 'Businesses accept the creators they want and reserve a spot.',
  },
  {
    icon: 'gift',
    title: 'Collab & deliver',
    body: 'Receive the gift, post your content, and mark it done. Simple.',
  },
];

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  // Enter guest mode (PRD §8.6) and jump straight to Explore. The root gate keeps
  // guests inside (auth) when they're there on purpose (e.g. Login to Apply), so
  // this first hop from welcome → explore is made explicitly here.
  const browseAsGuest = () => {
    continueAsGuest();
    router.replace('/(creator)/(tabs)/explore');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View className="items-center">
          <View
            className="h-20 w-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: colors.accent }}
          >
            <Icon name="gift" size={38} color={colors.accentText} />
          </View>
          <Text className="mt-5 text-3xl font-extrabold" style={{ color: colors.text }}>
            Collably
          </Text>
          <Text className="mt-2 text-center text-base" style={{ color: colors.text2 }}>
            Where brands and creators collab on gifting campaigns — and they
            actually happen.
          </Text>
        </View>

        {/* How it works */}
        <View className="mt-10">
          {HOW_IT_WORKS.map((step, i) => (
            <View key={step.title} className="flex-row items-center" style={{ marginTop: i === 0 ? 0 : 16 }}>
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.accentSoft }}
              >
                <Icon name={step.icon} size={21} color={colors.accent} strokeWidth={1.9} />
              </View>
              <View className="ml-3.5 flex-1">
                <Text className="text-[15px] font-bold" style={{ color: colors.text }}>
                  {step.title}
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: colors.text2, lineHeight: 18 }}>
                  {step.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View className="mt-auto pt-12">
          <Button block icon="briefcase" onPress={() => router.push('/(auth)/signup?role=business')}>
            Join as Business
          </Button>
          <View className="h-3" />
          <Button
            block
            variant="success"
            icon="sparkles"
            onPress={() => router.push('/(auth)/signup?role=creator')}
          >
            Join as Creator
          </Button>
          <View className="h-3" />
          <Button block variant="outline" icon="compass" onPress={browseAsGuest}>
            Browse Campaigns
          </Button>

          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-sm" style={{ color: colors.text2 }}>
              Already have an account?{' '}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.accent }}
              onPress={() => router.push('/(auth)/login')}
            >
              Log in
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
