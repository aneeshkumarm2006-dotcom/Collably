/**
 * Admin dashboard (PRD §7.5). The platform-wide overview: stat cards for the
 * user split (total / businesses / creators / admins), campaigns (total /
 * active), applications (total / today), completed collabs, signups (today /
 * this week), and the open-reports queue. Quick links jump to the moderation
 * surfaces. Pulls `GET /api/admin/dashboard`.
 */
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { Card, ErrorState, Icon, StatCard, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuthStore } from '@/store/authStore';

type DashboardStats = {
  users: { total: number; businesses: number; creators: number; admins: number };
  campaigns: { total: number; active: number };
  applications: { total: number; today: number };
  collabsCompleted: number;
  signups: { today: number; thisWeek: number };
  openReports: number;
};

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<DashboardStats>('/admin/dashboard');
    return res;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Dashboard" large />
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Dashboard" large />
        <ErrorState body={error} onRetry={reload} />
      </View>
    );
  }

  const s = data!;
  const firstName = (user?.name ?? 'Admin').split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Dashboard" subtitle={`Signed in as ${firstName}`} large />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 22 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
      >
        {/* Open reports — surfaced first when there's a queue to clear. */}
        {s.openReports > 0 && (
          <Card
            onPress={() => router.push('/(admin)/(tabs)/reports')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: colors.danger }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: `${colors.danger}1A`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="flag" size={22} color={colors.danger} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text }}>
                {s.openReports} open {s.openReports === 1 ? 'report' : 'reports'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>Tap to review the moderation queue.</Text>
            </View>
            <Icon name="chevR" size={20} color={colors.text3} />
          </Card>
        )}

        {/* Users */}
        <Section title="Users" colors={colors}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile><StatCard icon="users" value={s.users.total} label="Total users" tone="accent" /></Tile>
            <Tile><StatCard icon="store" value={s.users.businesses} label="Businesses" tone="accent" /></Tile>
            <Tile><StatCard icon="person" value={s.users.creators} label="Creators" tone="success" /></Tile>
            <Tile><StatCard icon="badge" value={s.users.admins} label="Admins" tone="warn" /></Tile>
          </View>
        </Section>

        {/* Activity */}
        <Section title="Activity" colors={colors}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile><StatCard icon="briefcase" value={s.campaigns.active} label="Active campaigns" tone="success" /></Tile>
            <Tile><StatCard icon="grid" value={s.campaigns.total} label="Total campaigns" tone="accent" /></Tile>
            <Tile><StatCard icon="inbox" value={s.applications.total} label="Applications" tone="accent" /></Tile>
            <Tile><StatCard icon="checkcircle" value={s.collabsCompleted} label="Collabs completed" tone="success" /></Tile>
          </View>
        </Section>

        {/* Growth */}
        <Section title="Growth" colors={colors}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile><StatCard icon="plus" value={s.signups.today} label="Signups today" tone="accent" /></Tile>
            <Tile><StatCard icon="sparkles" value={s.signups.thisWeek} label="Signups this week" tone="success" /></Tile>
            <Tile><StatCard icon="upload" value={s.applications.today} label="Applications today" tone="accent" /></Tile>
            <Tile><StatCard icon="flag" value={s.openReports} label="Open reports" tone="warn" /></Tile>
          </View>
        </Section>

        {/* Moderation shortcuts */}
        <Section title="Manage" colors={colors}>
          <Card padding={0}>
            <LinkRow icon="users" label="Users" onPress={() => router.push('/(admin)/(tabs)/users')} colors={colors} first />
            <LinkRow icon="briefcase" label="Campaigns" onPress={() => router.push('/(admin)/(tabs)/campaigns')} colors={colors} />
            <LinkRow icon="store" label="Businesses" onPress={() => router.push('/(admin)/businesses')} colors={colors} />
            <LinkRow icon="person" label="Creators" onPress={() => router.push('/(admin)/creators')} colors={colors} />
            <LinkRow icon="flag" label="Reports" onPress={() => router.push('/(admin)/(tabs)/reports')} colors={colors} />
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, minWidth: '46%' }}>{children}</View>;
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
      {children}
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  colors,
  first,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hair,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.text2} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
      <Icon name="chevR" size={18} color={colors.text3} />
    </Pressable>
  );
}
