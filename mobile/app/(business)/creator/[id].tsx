/**
 * Applicant profile (PRD §7.4). The business's read-only view of a creator who
 * applied: avatar, name, UGC badge, bio, niches, social reach, content types,
 * portfolio, and lifetime stats. Reached from a campaign's applicant card. The
 * creator display name + avatar come from the joined `user`.
 */
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { PortfolioGrid } from '@/components/creator';
import { Avatar, Badge, Card, Icon, StatCard, TagChip, EmptyState, ErrorState, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCompactNumber } from '@/lib/utils';
import type { CreatorProfile, UserSummary } from '@/types';

type CreatorWithUser = { profile: CreatorProfile; user: UserSummary | null };

export default function ApplicantProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<CreatorWithUser>(`/profile/creator/${id}`);
    return res;
  }, [id]);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Creator" onBack={() => router.back()} variant="card" />
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
        <Header title="Creator" onBack={() => router.back()} variant="card" />
        <ErrorState body={error ?? 'Creator not found.'} onRetry={reload} />
      </View>
    );
  }

  const p = data.profile;
  const name = data.user?.name ?? 'Creator';
  const social = p.socialHandles;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Creator" onBack={() => router.back()} variant="card" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <Card>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar src={data.user?.avatar} name={name} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                {name}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                {p.isUGCOnly && <Badge tone="accent" label="UGC creator" />}
                {!!p.location?.city && <Badge tone="muted" label={p.location.city} />}
              </View>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <StatCard icon="checkcircle" value={p.totalCollabsCompleted} label="Collabs done" tone="success" />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard icon="grid" value={p.portfolio.length} label="Portfolio" tone="accent" />
          </View>
        </View>

        {p.bio ? (
          <Section title="About" colors={colors}>
            <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>{p.bio}</Text>
          </Section>
        ) : null}

        {p.niche.length > 0 && (
          <Section title="Niches" colors={colors}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {p.niche.map((n) => (
                <TagChip key={n} label={n} small />
              ))}
            </View>
          </Section>
        )}

        {(social.instagram || social.youtube || social.tiktok) && (
          <Section title="Social reach" colors={colors}>
            <Card padding={0}>
              {social.instagram && (
                <SocialRow icon="instagram" handle={social.instagram.handle} count={social.instagram.followerCount != null ? `${formatCompactNumber(social.instagram.followerCount)} followers` : ''} colors={colors} first />
              )}
              {social.youtube && (
                <SocialRow icon="youtube" handle={social.youtube.handle} count={social.youtube.subscriberCount != null ? `${formatCompactNumber(social.youtube.subscriberCount)} subscribers` : ''} colors={colors} />
              )}
              {social.tiktok && (
                <SocialRow icon="play" handle={social.tiktok.handle} count={social.tiktok.followerCount != null ? `${formatCompactNumber(social.tiktok.followerCount)} followers` : ''} colors={colors} />
              )}
            </Card>
          </Section>
        )}

        {p.contentTypes.length > 0 && (
          <Section title="Content types" colors={colors}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {p.contentTypes.map((ct) => (
                <TagChip key={ct} label={ct} small />
              ))}
            </View>
          </Section>
        )}

        <Section title="Portfolio" colors={colors}>
          {p.portfolio.length > 0 ? (
            <PortfolioGrid items={p.portfolio} />
          ) : (
            <EmptyState icon="grid" title="No portfolio yet" style={{ paddingVertical: 24 }} />
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

function SocialRow({ icon, handle, count, colors, first }: { icon: IconName; handle: string; count: string; colors: ReturnType<typeof useTheme>['colors']; first?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hair,
      }}
    >
      <Icon name={icon} size={20} color={colors.text2} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{handle}</Text>
      <Text style={{ fontSize: 13, color: colors.text2 }}>{count}</Text>
    </View>
  );
}
