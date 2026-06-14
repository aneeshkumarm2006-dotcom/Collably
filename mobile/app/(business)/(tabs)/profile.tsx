/**
 * Business profile tab (PRD §7.4). The business's own profile: a tappable logo
 * (change → Cloudinary), identity + verification, lifetime stats, about, location/
 * website, and linked socials. Edit opens the full edit form; the gear opens
 * Settings. Reads `GET /api/profile/business`.
 */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { Avatar, Button, Card, Icon, StatCard, ErrorState, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import type { BusinessProfile } from '@/types';

export default function BusinessProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [logoBusy, setLogoBusy] = useState(false);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ profile: BusinessProfile }>('/profile/business');
    return res.profile;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const changeLogo = async () => {
    if (!data) return;
    setLogoBusy(true);
    try {
      const url = await pickAndUploadImage('logos', { aspect: [1, 1] });
      if (url) {
        // businessName + category are required by the PUT schema, so send them too.
        await api.put('/profile/business', { businessName: data.businessName, category: data.category, logo: url });
        setData((p) => (p ? { ...p, logo: url } : p));
      }
    } catch (err) {
      if (!(err instanceof ImagePermissionError) && !isApiError(err)) {
        // swallow — non-fatal; the logo simply stays unchanged
      }
    } finally {
      setLogoBusy(false);
    }
  };

  const openWebsite = (url?: string) => {
    if (!url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    void WebBrowser.openBrowserAsync(href);
  };

  const location = data ? [data.location.city, data.location.state, data.location.country].filter(Boolean).join(', ') : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Profile"
        large
        right={
          <Pressable onPress={() => router.push('/(business)/settings')} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
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
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
        >
          {/* Identity */}
          <Card>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Pressable onPress={changeLogo} style={{ opacity: logoBusy ? 0.6 : 1 }}>
                <Avatar src={data.logo} name={data.businessName} size={66} />
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
                    {data.businessName}
                  </Text>
                  {data.isVerified && <Icon name="badge" size={16} color={colors.accent} />}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>
                  {data.category}
                </Text>
                {!!location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Icon name="mappin" size={13} color={colors.text3} strokeWidth={1.7} />
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text3 }}>{location}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Button block variant="outline" icon="edit" onPress={() => router.push('/(business)/profile/edit')}>
                Edit profile
              </Button>
            </View>
          </Card>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <StatCard icon="briefcase" value={data.totalCampaigns} label="Campaigns" tone="accent" />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard icon="checkcircle" value={data.totalCollabsCompleted} label="Collabs done" tone="success" />
            </View>
          </View>

          {/* About */}
          {data.description ? (
            <Section title="About" colors={colors}>
              <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>{data.description}</Text>
            </Section>
          ) : null}

          {/* Website */}
          {data.website ? (
            <Section title="Website" colors={colors}>
              <Card onPress={() => openWebsite(data.website)} padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="link" size={18} color={colors.accent} strokeWidth={1.8} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.accent }}>{data.website}</Text>
                  <Icon name="arrowUR" size={16} color={colors.text3} strokeWidth={1.8} />
                </View>
              </Card>
            </Section>
          ) : null}

          {/* Socials */}
          {hasSocials(data) && (
            <Section title="Social links" colors={colors}>
              <Card padding={0}>
                {data.socialLinks.instagram ? (
                  <SocialRow icon="instagram" value={data.socialLinks.instagram} onPress={() => openWebsite(data.socialLinks.instagram)} colors={colors} first />
                ) : null}
                {data.socialLinks.youtube ? (
                  <SocialRow icon="youtube" value={data.socialLinks.youtube} onPress={() => openWebsite(data.socialLinks.youtube)} colors={colors} />
                ) : null}
                {data.socialLinks.tiktok ? (
                  <SocialRow icon="play" value={data.socialLinks.tiktok} onPress={() => openWebsite(data.socialLinks.tiktok)} colors={colors} />
                ) : null}
              </Card>
            </Section>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function hasSocials(p: BusinessProfile): boolean {
  return !!(p.socialLinks.instagram || p.socialLinks.youtube || p.socialLinks.tiktok);
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{title}</Text>
      {children}
    </View>
  );
}

function SocialRow({ icon, value, onPress, colors, first }: { icon: IconName; value: string; onPress: () => void; colors: ReturnType<typeof useTheme>['colors']; first?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hair,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.text2} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.text }}>{value}</Text>
      <Icon name="arrowUR" size={15} color={colors.text3} strokeWidth={1.8} />
    </Pressable>
  );
}
