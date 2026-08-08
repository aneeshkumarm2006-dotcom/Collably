/**
 * Campaign detail (PRD §7.3). Hero cover, the posting business, reward, deliverables,
 * deadline/applicants, tags, and other campaigns from the same business — under a sticky
 * bottom Apply bar. The bar adapts to the viewer: a guest sees "Log in to apply"
 * (PRD §8.6), a creator who already applied sees their status, and an eligible
 * creator opens a pitch sheet → `POST /api/campaigns/:id/apply`.
 */
import { useRef, useState, useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { CoverImage } from '@/components/campaign/CoverImage';
import {
  CampaignCard,
  CampaignMap,
  Marker,
  Circle,
  MAPS_AVAILABLE,
  MapPlaceholder,
  toLatLng,
  regionForPoint,
  openInMaps,
} from '@/components/campaign';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  TagChip,
  TextArea,
  SkeletonCard,
  ErrorState,
  BottomSheet,
  type BottomSheetRef,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { api, isApiError } from '@/lib/api';
import * as WebBrowser from 'expo-web-browser';
import { useFetch } from '@/lib/useFetch';
import {
  formatReward,
  formatCountdown,
  formatDate,
  formatCompactNumber,
  formatRelativeTime,
  isOverdue,
} from '@/lib/utils';
import type { ApplicationStatus } from '@/constants';
import type { Campaign, BusinessProfile, Application } from '@/types';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };

const PLATFORM_ICON: Record<string, IconName> = {
  Instagram: 'instagram',
  YouTube: 'youtube',
  TikTok: 'play',
  Google: 'star',
  Any: 'sparkles',
};

export default function CampaignDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const role = useAuthStore((s) => s.role);
  const isGuest = useAuthStore((s) => s.isGuest);
  const approved = useAuthStore((s) => s.approved);
  const isCreator = role === 'creator';

  const pitchRef = useRef<BottomSheetRef>(null);
  const [pitch, setPitch] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  // The WHOLE application, not just its status: the "Your collab" block needs the
  // brand's note, the submission and the deadline, and the sticky bar needs the id
  // to route to the submit screen. Status is derived where it is used.
  const [myApp, setMyApp] = useState<Application | null>(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ campaign: CampaignWithBusiness }>(`/campaigns/${id}`);
    // For a logged-in creator, find out whether they've already applied.
    if (isCreator) {
      try {
        const { data: apps } = await api.get<{ data: Application[] }>('/applications', {
          params: { campaignId: id, limit: 1 },
        });
        setMyApp(apps.data[0] ?? null);
      } catch {
        setMyApp(null);
      }
    }
    return res.campaign;
  }, [id]);

  // Re-pull on focus so returning from the submit screen flips the sticky bar from
  // "Submit content" to "Update submission" instead of showing stale state.
  useFocusEffect(useCallback(() => reload(), [reload]));

  const others = useFetch(async () => {
    if (!data?.businessId) return [] as CampaignWithBusiness[];
    const { data: res } = await api.get<{ data: CampaignWithBusiness[] }>('/campaigns', {
      params: { businessId: data.businessId, limit: 4 },
    });
    return res.data.filter((c) => c._id !== data._id).slice(0, 3);
  }, [data?._id, data?.businessId]);

  const submitApply = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      const { data: created } = await api.post<{ application: Application }>(
        `/campaigns/${id}/apply`,
        pitch.trim() ? { pitch: pitch.trim() } : {},
      );
      setMyApp(created.application);
      pitchRef.current?.dismiss();
      setPitch('');
    } catch (err) {
      setApplyError(isApiError(err) ? err.message : 'Could not submit your application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header onBack={() => router.back()} />
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
        <Header onBack={() => router.back()} />
        <ErrorState body={error ?? 'Campaign not found.'} onRetry={reload} />
      </View>
    );
  }

  const c = data;
  const biz = c.business;
  // No capacity limit — a campaign accepts applications while it's Active and
  // auto-closes once the business approves its first creator.
  const canApply = c.status === 'Active';
  const overdue = isOverdue(c.deadline);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Campaign" onBack={() => router.back()} variant="card" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <CoverImage src={c.coverImage} category={c.category} contentFit="contain" style={{ aspectRatio: 16 / 9 }}>
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: 'rgba(255,255,255,0.92)',
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#131A2E' }}>{c.category}</Text>
          </View>
        </CoverImage>

        <View style={{ padding: 16, gap: 16 }}>
          {/* YOUR COLLAB — above the brief on purpose.
              Someone who already has an accepted collab opened this screen to check
              a deadline, read the brand's feedback, or submit. The brief is
              reference material they've already read. Ordering by intent is the
              whole point of merging the old /collabs/:id screen into this one. */}
          {myApp ? <YourCollab app={myApp} campaign={c} colors={colors} /> : null}

          {/* Title + status */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge status={c.status} />
              {c.isRemote && <Badge tone="accent" label="Remote" />}
            </View>
            <Text
              style={{
                fontSize: 23,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.4,
                lineHeight: 29,
              }}
            >
              {c.title}
            </Text>
          </View>

          {/* Business card */}
          {biz && (
            <Card
              onPress={() =>
                router.push({ pathname: '/(creator)/business/[id]', params: { id: biz._id } })
              }
              padding={14}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar src={biz.logo} name={biz.businessName} size={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}
                    >
                      {biz.businessName}
                    </Text>
                    {biz.isVerified && <Icon name="badge" size={15} color={colors.accent} />}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12.5, color: colors.text2, marginTop: 1 }}
                  >
                    {[biz.category, biz.location?.city].filter(Boolean).join(' · ') || 'Business'}
                  </Text>
                </View>
                <Icon name="chevR" size={18} color={colors.text3} />
              </View>
            </Card>
          )}

          {/* Reward + key facts */}
          <Card padding={0}>
            <FactRow
              icon="gift"
              label="Reward"
              value={`${formatReward(c.reward)} · ${c.reward.type}`}
              tone={colors.money}
              colors={colors}
              first
            />
            <FactRow
              icon="calendar"
              label="Deadline"
              value={`${formatDate(c.deadline)} · ${formatCountdown(c.deadline)}`}
              tone={overdue ? colors.danger : colors.text}
              colors={colors}
            />
            <FactRow
              icon="users"
              label="Applicants"
              value={`${formatCompactNumber(c.applicationsCount)} applied${c.status === 'Active' ? '' : ' · closed'}`}
              tone={colors.text}
              colors={colors}
            />
            {c.minFollowers > 0 && (
              <FactRow
                icon="sparkles"
                label="Min. followers"
                value={formatCompactNumber(c.minFollowers)}
                tone={colors.text}
                colors={colors}
              />
            )}
          </Card>

          {/* About */}
          <Section title="About this campaign" colors={colors}>
            <Text style={{ fontSize: 14.5, color: colors.text2, lineHeight: 22 }}>
              {c.description}
            </Text>
          </Section>

          {/* Location (On-Site Location feature) */}
          <LocationSection campaign={c} colors={colors} />

          {/* Deliverables */}
          {c.deliverables.length > 0 && (
            <Section title="What you'll create" colors={colors}>
              <View style={{ gap: 10 }}>
                {c.deliverables.map((d, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.hair,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: colors.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={PLATFORM_ICON[d.platform] ?? 'sparkles'}
                        size={20}
                        color={colors.accent}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text }}>
                        {d.quantity} × {d.contentType}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: colors.text2, marginTop: 1 }}>
                        {d.platform}
                      </Text>
                      {d.requirements ? (
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text2,
                            marginTop: 5,
                            lineHeight: 19,
                          }}
                        >
                          {d.requirements}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Tags */}
          {c.tags.length > 0 && (
            <Section title="Tags" colors={colors}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {c.tags.map((t) => (
                  <TagChip key={t} label={t} small />
                ))}
              </View>
            </Section>
          )}

          {/* Other campaigns from this business */}
          {others.data && others.data.length > 0 && (
            <Section title={`More from ${biz?.businessName ?? 'this business'}`} colors={colors}>
              <View style={{ gap: 10 }}>
                {others.data.map((o) => (
                  <CampaignCard
                    key={o._id}
                    campaign={o}
                    businessName={o.business?.businessName ?? biz?.businessName}
                    compact
                    onPress={() =>
                      router.push({ pathname: '/(creator)/campaign/[id]', params: { id: o._id } })
                    }
                  />
                ))}
              </View>
            </Section>
          )}
        </View>
      </ScrollView>

      {/* Sticky apply bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: colors.bgElev,
          borderTopWidth: 1,
          borderTopColor: colors.hair,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, color: colors.text3 }}
          >
            REWARD
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: colors.money }}>
            {formatReward(c.reward)}
          </Text>
        </View>
        <ApplyControl
          isGuest={isGuest}
          isCreator={isCreator}
          approved={approved}
          myApp={myApp}
          canApply={canApply}
          campaignStatus={c.status}
          onLogin={() => router.push('/(auth)/login')}
          onApply={() => pitchRef.current?.present()}
          onSubmitContent={() =>
            myApp &&
            router.push({
              pathname: '/(creator)/collabs/[applicationId]/submit',
              params: { applicationId: myApp._id },
            })
          }
          onViewPost={() => {
            if (myApp?.submissionLink) void WebBrowser.openBrowserAsync(myApp.submissionLink);
          }}
        />
      </View>

      {/* Pitch sheet */}
      <BottomSheet ref={pitchRef} title="Apply to this campaign" snapPoints={['62%']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
            Add a short pitch (optional) telling {biz?.businessName ?? 'the business'} why you're a
            great fit.
          </Text>
          <TextArea
            value={pitch}
            onChangeText={setPitch}
            placeholder="e.g. I'm a Toronto food creator with an engaged audience that loves discovering new cafes…"
            maxLength={2000}
          />
          {applyError && <Text style={{ fontSize: 13, color: colors.danger }}>{applyError}</Text>}
          <Button block loading={applying} onPress={submitApply}>
            Submit application
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

/**
 * The sticky bottom action.
 *
 * Rule: never render a button when there is nothing to press. A disabled button
 * reads as a broken one, so states with no available action (Pending review,
 * Rejected) show a status chip instead. This used to show a bare Badge for EVERY
 * applied state, which meant an accepted creator had no way to submit from here at
 * all — they had to find the separate collab screen.
 */
function ApplyControl({
  isGuest,
  isCreator,
  approved,
  myApp,
  canApply,
  campaignStatus,
  onLogin,
  onApply,
  onSubmitContent,
  onViewPost,
}: {
  isGuest: boolean;
  isCreator: boolean;
  approved: boolean;
  myApp: Application | null;
  canApply: boolean;
  campaignStatus: Campaign['status'];
  onLogin: () => void;
  onApply: () => void;
  onSubmitContent: () => void;
  onViewPost: () => void;
}) {
  const myStatus: ApplicationStatus | null = myApp?.status ?? null;
  // Guests (and anyone not signed in as a creator) are prompted to log in.
  if (isGuest || !isCreator) {
    return (
      <Button icon="lock" onPress={onLogin}>
        Log in to apply
      </Button>
    );
  }
  if (myApp && myStatus) {
    const submitted = !!myApp.submittedAt;

    // Accepted (or overdue) — the whole point of the merge: submit from here.
    if (myStatus === 'Accepted' || myStatus === 'Overdue') {
      return (
        <Button icon={submitted ? 'edit' : 'upload'} onPress={onSubmitContent}>
          {submitted ? 'Update submission' : 'Submit content'}
        </Button>
      );
    }
    // Done — the useful action is seeing the live post, not a badge.
    if (myStatus === 'Completed' && myApp.submissionLink) {
      return (
        <Button variant="outline" icon="arrowUR" onPress={onViewPost}>
          View your post
        </Button>
      );
    }
    // Pending / Rejected — nothing to do, so no button.
    return <Badge status={myStatus} />;
  }
  if (!approved) {
    // Creator pending admin verification — can browse, but not apply yet.
    return (
      <View style={{ opacity: 0.6 }}>
        <Button disabled icon="lock" onPress={() => {}}>
          Under review
        </Button>
      </View>
    );
  }
  if (!canApply) {
    // canApply is false only when the campaign isn't Active (e.g. auto-closed).
    const label = campaignStatus === 'Closed' ? 'Closed' : campaignStatus;
    return (
      <View style={{ opacity: 0.6 }}>
        <Button disabled onPress={() => {}}>
          {label}
        </Button>
      </View>
    );
  }
  return (
    <Button icon="zap" onPress={onApply}>
      Apply now
    </Button>
  );
}

/**
 * Location block (On-Site Location feature). Shows the exact pin + address +
 * "Open in Maps" once the creator is accepted (`locationPrecise`); otherwise a
 * fuzzed circle over the approximate area with a "revealed once accepted" note.
 * Falls back to a "map coming soon" placeholder while maps are disabled, and
 * renders nothing for remote campaigns.
 */
function LocationSection({
  campaign,
  colors,
}: {
  campaign: CampaignWithBusiness;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const loc = campaign.location;
  if (campaign.isRemote || !loc) return null;

  const cityLine = [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  const exact = loc.locationPrecise && loc.coordinates ? loc.coordinates : null;
  const approx = loc.approxCoordinates ?? null;
  const radius = loc.radiusMeters ?? 750;

  // Nothing geographic and no city text → no section at all.
  if (!exact && !approx && !cityLine) return null;

  const STATIC_MAP = {
    scrollEnabled: false,
    zoomEnabled: false,
    rotateEnabled: false,
    pitchEnabled: false,
    toolbarEnabled: false,
  };

  return (
    <Section title="Location" colors={colors}>
      {cityLine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="mappin" size={16} color={colors.text3} />
          <Text style={{ fontSize: 14.5, color: colors.text2 }}>{cityLine}</Text>
        </View>
      ) : null}

      {!MAPS_AVAILABLE ? (
        exact || approx ? (
          <View style={{ marginTop: 10 }}>
            <MapPlaceholder height={160} hint="Map view is coming soon." />
          </View>
        ) : null
      ) : exact ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          <CampaignMap
            height={180}
            mapProps={{ initialRegion: regionForPoint(exact, 1200), ...STATIC_MAP }}
          >
            <Marker coordinate={toLatLng(exact)} />
          </CampaignMap>
          {loc.address ? (
            <Text style={{ fontSize: 13.5, color: colors.text2, lineHeight: 19 }}>
              {loc.address}
            </Text>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            icon="arrowUR"
            onPress={() => openInMaps(exact, campaign.title)}
          >
            Open in Maps
          </Button>
        </View>
      ) : approx ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <CampaignMap
            height={180}
            mapProps={{ initialRegion: regionForPoint(approx, radius * 3.2), ...STATIC_MAP }}
          >
            <Circle
              center={toLatLng(approx)}
              radius={radius}
              strokeColor={colors.accent}
              fillColor={`${colors.accent}22`}
              strokeWidth={2}
            />
          </CampaignMap>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={14} color={colors.text3} />
            <Text style={{ flex: 1, fontSize: 12.5, color: colors.text3, lineHeight: 17 }}>
              Exact location is revealed once you&apos;re accepted.
            </Text>
          </View>
        </View>
      ) : null}
    </Section>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FactRow({
  icon,
  label,
  value,
  tone,
  colors,
  first,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: string;
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
      <Icon name={icon} size={19} color={colors.text3} strokeWidth={1.8} />
      <Text style={{ fontSize: 13.5, color: colors.text3, width: 100 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: tone, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * "Your collab" — the creator's own standing in this campaign, shown above the
 * brief once they've applied.
 *
 * This is the content that used to live on a separate `/collabs/:id` screen. It was
 * split off because the data lives on the Application rather than the Campaign, but
 * to a creator "my collab" is one thing: the deal AND where I stand in it. Making
 * them choose between two screens meant guessing which one held the answer.
 *
 * Ordered by urgency, not by data shape: a revision request from the brand outranks
 * everything, then the deadline, then what you already sent.
 */
function YourCollab({
  app,
  campaign,
  colors,
}: {
  app: Application;
  campaign: CampaignWithBusiness;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const submitted = !!app.submittedAt;
  const overdue = app.status === 'Accepted' && !submitted && isOverdue(campaign.deadline ?? '');

  const openLink = (url?: string) => {
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  return (
    <View
      style={{
        backgroundColor: colors.cardSunk,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.text3 }}>
          YOUR COLLAB
        </Text>
        <View style={{ flex: 1 }} />
        <Badge status={overdue ? 'Overdue' : app.status} />
      </View>

      {campaign.deadline ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="clock" size={15} color={overdue ? colors.danger : colors.text3} strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: overdue ? colors.danger : colors.text2 }}>
            {formatCountdown(campaign.deadline)}
          </Text>
        </View>
      ) : null}

      {/* The brand asked for something. Highest-priority thing on the screen. */}
      {app.businessNote ? (
        <View style={{ backgroundColor: colors.warnSoft, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text2 }}>NOTE FROM THE BRAND</Text>
          <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{app.businessNote}</Text>
        </View>
      ) : null}

      {submitted ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text3 }}>
            YOU SUBMITTED {formatRelativeTime(app.submittedAt!).toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {app.submissionProof ? (
              <CoverImage src={app.submissionProof} category="Other" radius={10} style={{ width: 56, height: 70 }} />
            ) : null}
            <View style={{ flex: 1, gap: 6 }}>
              {app.submissionNote ? (
                <Text numberOfLines={3} style={{ fontSize: 13.5, color: colors.text2, lineHeight: 19 }}>
                  {app.submissionNote}
                </Text>
              ) : null}
              {app.submissionLink ? (
                <Button variant="ghost" size="sm" icon="arrowUR" onPress={() => openLink(app.submissionLink)}>
                  View your post
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {app.pitch ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text3 }}>YOUR PITCH</Text>
          <Text numberOfLines={3} style={{ fontSize: 13.5, color: colors.text2, lineHeight: 19 }}>
            {app.pitch}
          </Text>
        </View>
      ) : null}

      {app.status === 'Completed' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="checkcircle" size={16} color={colors.success} />
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.success }}>
            Verified &amp; completed{app.verifiedAt ? ` · ${formatRelativeTime(app.verifiedAt)}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
