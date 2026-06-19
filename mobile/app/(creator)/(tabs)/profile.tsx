/**
 * Creator profile tab (PRD §7.3). The creator's own profile: a tappable avatar
 * (change → Cloudinary), identity + lifetime stats, bio, niches, socials, content
 * types, and the portfolio grid. Edit opens the full edit form; the gear opens
 * Settings.
 */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { PortfolioGrid } from '@/components/creator';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  StatCard,
  TagChip,
  EmptyState,
  ErrorState,
  SkeletonCard,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCompactNumber } from '@/lib/utils';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useAuthStore } from '@/store/authStore';
import type { CreatorProfile, PublicUser } from '@/types';

export default function CreatorProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setApproved = useAuthStore((s) => s.setApproved);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ profile: CreatorProfile }>('/profile/creator');
    // Keep the cached approval flag (used to gate "apply") in sync with the profile.
    setApproved(res.profile.isVerified);
    return res.profile;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const [avatarBusy, setAvatarBusy] = useState(false);

  const changeAvatar = async () => {
    setAvatarBusy(true);
    try {
      const url = await pickAndUploadImage('avatars', { aspect: [1, 1] });
      if (url) {
        await api.patch('/auth/me', { avatar: url });
        if (user) setUser({ ...user, avatar: url } as PublicUser);
      }
    } catch (err) {
      if (!(err instanceof ImagePermissionError) && !isApiError(err)) {
        // swallow — non-fatal; the avatar simply stays unchanged
      }
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Profile"
        large
        right={
          <Pressable onPress={() => router.push('/(creator)/settings')} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Icon name="gear" size={23} color={colors.text} />
          </Pressable>
        }
      />

      {loading && !data ? (
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error && !data ? (
        <ErrorState body={error} onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
        >
          {/* Identity */}
          <Card>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Pressable onPress={changeAvatar} style={{ opacity: avatarBusy ? 0.6 : 1 }}>
                <Avatar src={user?.avatar} name={user?.name} size={66} />
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.card,
                  }}
                >
                  <Icon name="camera" size={13} color="#fff" />
                </View>
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                    {user?.name ?? 'Creator'}
                  </Text>
                  {data?.isVerified && <Icon name="badge" size={16} color={colors.accent} />}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>
                  {user?.email}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {data?.isUGCOnly && <Badge tone="accent" label="UGC creator" />}
                  {!!data?.location?.city && <Badge tone="muted" label={data.location.city} />}
                </View>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Button block variant="outline" icon="edit" onPress={() => router.push('/(creator)/profile/edit')}>
                Edit profile
              </Button>
            </View>
          </Card>

          {/* Verification status: under review until an admin approves. */}
          {data && !data.isVerified && (
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                backgroundColor: colors.warnSoft,
                borderWidth: 1,
                borderColor: colors.warn,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Icon name="clock" size={20} color={colors.warn} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  Profile under review
                </Text>
                <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, lineHeight: 18 }}>
                  You can explore campaigns, but you can&apos;t apply until an admin verifies your
                  account.
                </Text>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <StatCard icon="checkcircle" value={data?.totalCollabsCompleted ?? 0} label="Collabs done" tone="success" />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard icon="gift" value={`$${formatCompactNumber(data?.totalRewardsEarned ?? 0)}`} label="Earned" tone="money" />
            </View>
          </View>

          {/* Bio */}
          {data?.bio ? (
            <Section title="About" colors={colors}>
              <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>{data.bio}</Text>
            </Section>
          ) : null}

          {/* Niches */}
          {data && data.niche.length > 0 && (
            <Section title="Niches" colors={colors}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {data.niche.map((n) => (
                  <TagChip key={n} label={n} small />
                ))}
              </View>
            </Section>
          )}

          {/* Socials */}
          {data && hasSocials(data) && (
            <Section title="Social reach" colors={colors}>
              <Card padding={0}>
                {data.socialHandles.instagram && (
                  <SocialRow
                    icon="instagram"
                    handle={data.socialHandles.instagram.handle}
                    count={
                      data.socialHandles.instagram.followerCount != null
                        ? `${formatCompactNumber(data.socialHandles.instagram.followerCount)} followers`
                        : ''
                    }
                    colors={colors}
                    first
                  />
                )}
                {data.socialHandles.youtube && (
                  <SocialRow
                    icon="youtube"
                    handle={data.socialHandles.youtube.handle}
                    count={
                      data.socialHandles.youtube.subscriberCount != null
                        ? `${formatCompactNumber(data.socialHandles.youtube.subscriberCount)} subscribers`
                        : ''
                    }
                    colors={colors}
                  />
                )}
                {data.socialHandles.tiktok && (
                  <SocialRow
                    icon="play"
                    handle={data.socialHandles.tiktok.handle}
                    count={
                      data.socialHandles.tiktok.followerCount != null
                        ? `${formatCompactNumber(data.socialHandles.tiktok.followerCount)} followers`
                        : ''
                    }
                    colors={colors}
                  />
                )}
              </Card>
            </Section>
          )}

          {/* Content types */}
          {data && data.contentTypes.length > 0 && (
            <Section title="Content types" colors={colors}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {data.contentTypes.map((ct) => (
                  <TagChip key={ct} label={ct} small />
                ))}
              </View>
            </Section>
          )}

          {/* Portfolio */}
          <Section title="Portfolio" colors={colors}>
            {data && data.portfolio.length > 0 ? (
              <PortfolioGrid items={data.portfolio} />
            ) : (
              <EmptyState
                icon="grid"
                title="No portfolio yet"
                body="Add up to 6 images of your best work to stand out to brands."
                action="Add work"
                onAction={() => router.push('/(creator)/profile/edit')}
                style={{ paddingVertical: 28 }}
              />
            )}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

function hasSocials(p: CreatorProfile): boolean {
  return !!(p.socialHandles.instagram || p.socialHandles.youtube || p.socialHandles.tiktok);
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{title}</Text>
      {children}
    </View>
  );
}

function SocialRow({
  icon,
  handle,
  count,
  colors,
  first,
}: {
  icon: IconName;
  handle: string;
  count: string;
  colors: ReturnType<typeof useTheme>['colors'];
  first?: boolean;
}) {
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
