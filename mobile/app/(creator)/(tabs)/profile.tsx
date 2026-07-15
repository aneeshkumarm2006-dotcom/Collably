/**
 * Creator profile tab (PRD §7.3) — the creator's own profile, redesigned as a
 * premium hero: a gradient banner with the overlapping avatar, identity + a
 * reach/earnings stat strip, then bio, niches, content types, verified socials,
 * and the portfolio grid. Edit opens the full form; the gear opens Settings.
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
  Icon,
  TagChip,
  EmptyState,
  ErrorState,
  SkeletonCard,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCompactNumber, formatMoneyCompact } from '@/lib/utils';
import { VerifiedBadge } from '@/components/verify';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { useAuthStore } from '@/store/authStore';
import type { CreatorProfile, PublicUser } from '@/types';

export default function CreatorProfileScreen() {
  const { colors, shadows } = useTheme();
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

  const social = data?.socialHandles;
  // Headline reach: followers/subscribers across every connected platform.
  const reach =
    (social?.instagram?.followerCount ?? 0) +
    (social?.youtube?.subscriberCount ?? 0) +
    (social?.tiktok?.followerCount ?? 0);
  const locationLabel = [data?.location?.city, data?.location?.state].filter(Boolean).join(', ');

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
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
        >
          {/* ── Hero ── */}
          <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, ...shadows.card }}>
            <View style={{ height: 96, backgroundColor: colors.accent }} />
            <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
              {/* avatar (overlapping the banner) + Edit */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -46 }}>
                <Pressable onPress={changeAvatar} style={{ opacity: avatarBusy ? 0.6 : 1 }}>
                  <View style={{ borderRadius: 999, borderWidth: 4, borderColor: colors.card }}>
                    <Avatar src={user?.avatar} name={user?.name} size={88} />
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
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

                <Pressable
                  onPress={() => router.push('/(creator)/profile/edit')}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairStrong, marginBottom: 4 },
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <Icon name="edit" size={14} color={colors.text} />
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>Edit</Text>
                </Pressable>
              </View>

              {/* name + verified */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                  {user?.name ?? 'Creator'}
                </Text>
                {data?.isVerified && <Icon name="badge" size={18} color={colors.accent} />}
              </View>

              {/* location · email + email-verification affordance */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                {!!locationLabel && (
                  <>
                    <Icon name="mappin" size={14} color={colors.text3} strokeWidth={2} />
                    <Text style={{ fontSize: 13, color: colors.text2 }}>{locationLabel}</Text>
                    <Text style={{ fontSize: 13, color: colors.text3 }}>·</Text>
                  </>
                )}
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: colors.text2 }}>
                  {user?.email}
                </Text>
                {user?.isVerified ? (
                  <VerifiedBadge size={14} />
                ) : (
                  <Pressable
                    onPress={() => router.push('/verify/email')}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: colors.accentSoft,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 7,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.accent }}>Verify</Text>
                    <Icon name="arrowR" size={11} color={colors.accent} strokeWidth={2.6} />
                  </Pressable>
                )}
              </View>

              {/* phone: verified number, or a prompt to add + verify one */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Icon name="phone" size={14} color={colors.text3} strokeWidth={2} />
                {user?.isPhoneVerified && user?.phone ? (
                  <>
                    <Text style={{ fontSize: 13, color: colors.text2 }}>{user.phone}</Text>
                    <VerifiedBadge size={14} />
                  </>
                ) : (
                  <Pressable
                    onPress={() => router.push('/verify/phone')}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: colors.accentSoft,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 7,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.accent }}>
                      Add phone number
                    </Text>
                    <Icon name="arrowR" size={11} color={colors.accent} strokeWidth={2.6} />
                  </Pressable>
                )}
              </View>

              {/* niche + UGC tags */}
              {(data?.niche?.length || data?.isUGCOnly) ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {data?.isUGCOnly && <Pill label="UGC creator" tone="accent" colors={colors} />}
                  {data?.niche?.map((n) => <Pill key={n} label={n} colors={colors} />)}
                </View>
              ) : null}

              {/* stat strip */}
              <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.hair }}>
                <Stat value={String(data?.totalCollabsCompleted ?? 0)} label="Collabs" colors={colors} />
                <Stat value={formatCompactNumber(reach)} label="Reach" colors={colors} divider />
                <Stat value={formatMoneyCompact(data?.totalRewardsEarned ?? 0)} label="Earned" colors={colors} divider />
              </View>
            </View>
          </View>

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
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Profile under review</Text>
                <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, lineHeight: 18 }}>
                  You can explore campaigns, but you can&apos;t apply until an admin verifies your account.
                </Text>
              </View>
            </View>
          )}

          {/* Bio */}
          {data?.bio ? (
            <Section title="About" colors={colors}>
              <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>{data.bio}</Text>
            </Section>
          ) : null}

          {/* Social reach — only platforms with a real handle. */}
          {social && (social.instagram?.handle || social.youtube?.handle || social.tiktok?.handle) && (
            <Section title="Social reach" colors={colors}>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, borderRadius: 14, overflow: 'hidden' }}>
                {social.instagram?.handle && (
                  <SocialRow
                    icon="instagram"
                    handle={social.instagram.handle}
                    count={social.instagram.followerCount != null ? `${formatCompactNumber(social.instagram.followerCount)} followers` : ''}
                    colors={colors}
                    first
                  />
                )}
                {social.youtube?.handle && (
                  <SocialRow
                    icon="youtube"
                    handle={social.youtube.handle}
                    count={social.youtube.subscriberCount != null ? `${formatCompactNumber(social.youtube.subscriberCount)} subscribers` : ''}
                    colors={colors}
                    first={!social.instagram?.handle}
                  />
                )}
                {social.tiktok?.handle && (
                  <SocialRow
                    icon="play"
                    handle={social.tiktok.handle}
                    count={social.tiktok.followerCount != null ? `${formatCompactNumber(social.tiktok.followerCount)} followers` : ''}
                    colors={colors}
                    first={!social.instagram?.handle && !social.youtube?.handle}
                  />
                )}
              </View>
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

/** Small pill used for niches / UGC in the hero. */
function Pill({ label, tone, colors }: { label: string; tone?: 'accent'; colors: ReturnType<typeof useTheme>['colors'] }) {
  const accent = tone === 'accent';
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: accent ? colors.accentSoft : colors.cardSunk,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: accent ? colors.accent : colors.text2 }}>{label}</Text>
    </View>
  );
}

/** One column of the hero stat strip. */
function Stat({
  value,
  label,
  colors,
  divider,
}: {
  value: string;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  divider?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: divider ? 1 : 0, borderLeftColor: colors.hair }}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{label}</Text>
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
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{handle}</Text>
      <Text style={{ fontSize: 13, color: colors.text2 }}>{count}</Text>
    </View>
  );
}
