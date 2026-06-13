/**
 * Public business profile (PRD §7.3). A read-only view of a brand reached from a
 * campaign: logo, verification, category/location, description, website, lifetime
 * stats, and the brand's currently-active campaigns. Guest-accessible (PRD §8.6).
 */
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/shared';
import { CampaignCard } from '@/components/campaign';
import { Avatar, Badge, Button, Card, Icon, StatCard, EmptyState, ErrorState, SkeletonCard } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { BusinessProfile, Campaign, UserSummary } from '@/types';

type BusinessWithUser = { profile: BusinessProfile; user: UserSummary | null };
type CampaignWithBusiness = Campaign & { business?: BusinessProfile };

export default function BusinessProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, loading, error, reload } = useFetch(async () => {
    const [profileRes, campaignsRes] = await Promise.all([
      api.get<BusinessWithUser>(`/profile/business/${id}`),
      api.get<{ data: CampaignWithBusiness[] }>('/campaigns', { params: { businessId: id, limit: 20 } }),
    ]);
    return { ...profileRes.data, campaigns: campaignsRes.data.data };
  }, [id]);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Business" onBack={() => router.back()} variant="card" />
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Business" onBack={() => router.back()} variant="card" />
        <ErrorState body={error ?? 'Business not found.'} onRetry={reload} />
      </View>
    );
  }

  const p = data.profile;
  const location = [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Business" onBack={() => router.back()} variant="card" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <Card>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar src={p.logo} name={p.businessName} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                  {p.businessName}
                </Text>
                {p.isVerified && <Icon name="badge" size={16} color={colors.accent} />}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                <Badge tone="muted" label={p.category} />
                {!!p.location?.city && <Badge tone="muted" label={p.location.city} />}
              </View>
            </View>
          </View>
          {p.website ? (
            <View style={{ marginTop: 14 }}>
              <Button block variant="outline" icon="link" onPress={() => void WebBrowser.openBrowserAsync(p.website!)}>
                Visit website
              </Button>
            </View>
          ) : null}
        </Card>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <StatCard icon="briefcase" value={p.totalCampaigns} label="Campaigns" tone="accent" />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard icon="checkcircle" value={p.totalCollabsCompleted} label="Collabs done" tone="success" />
          </View>
        </View>

        {/* About */}
        {p.description ? (
          <Section title="About" colors={colors}>
            <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>{p.description}</Text>
          </Section>
        ) : null}

        {location ? (
          <Section title="Location" colors={colors}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="mappin" size={17} color={colors.text3} />
              <Text style={{ fontSize: 14, color: colors.text2 }}>{location}</Text>
            </View>
          </Section>
        ) : null}

        {/* Active campaigns */}
        <Section title="Active campaigns" colors={colors}>
          {data.campaigns.length === 0 ? (
            <EmptyState
              icon="briefcase"
              title="No active campaigns"
              body="This business doesn't have any open campaigns right now."
              style={{ paddingVertical: 28 }}
            />
          ) : (
            <View style={{ gap: 14 }}>
              {data.campaigns.map((c) => (
                <CampaignCard
                  key={c._id}
                  campaign={c}
                  businessName={p.businessName}
                  onPress={() => router.push({ pathname: '/(creator)/campaign/[id]', params: { id: c._id } })}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{title}</Text>
      {children}
    </View>
  );
}
