/**
 * Collab detail (PRD §7.3). The lifecycle view for one accepted application: the
 * campaign it's for, the current status + deadline, the creator's submission (link,
 * proof, note) once made, and the brand's note. Drives the contextual CTA —
 * Submit / Update submission / View post — and is the target of `/collabs/:id`
 * notification deep links.
 */
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/shared';
import { CoverImage } from '@/components/campaign/CoverImage';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  SkeletonCard,
  ErrorState,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCountdown, formatReward, formatRelativeTime, isOverdue } from '@/lib/utils';
import type { Application, Campaign, BusinessProfile } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };

export default function CollabDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ application: AppWithRefs }>(`/applications/${applicationId}`);
    return res.application;
  }, [applicationId]);

  const openLink = (url?: string) => {
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Collab" onBack={() => router.back()} variant="card" />
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
        <Header title="Collab" onBack={() => router.back()} variant="card" />
        <ErrorState body={error ?? 'Collab not found.'} onRetry={reload} />
      </View>
    );
  }

  const a = data;
  const campaign = a.campaign;
  const submitted = !!a.submittedAt;
  const overdue = a.status === 'Accepted' && !submitted && isOverdue(campaign?.deadline ?? '');
  const canSubmit = a.status === 'Accepted' || a.status === 'Overdue';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Collab" onBack={() => router.back()} variant="card" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Campaign */}
        {campaign && (
          <Card
            onPress={() => router.push({ pathname: '/(creator)/campaign/[id]', params: { id: a.campaignId } })}
            padding={12}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <CoverImage src={campaign.coverImage} category={campaign.category} radius={11} style={{ width: 64, height: 64 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}>
                  {campaign.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Avatar src={campaign.business?.logo} name={campaign.business?.businessName} size={18} />
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2 }}>
                    {campaign.business?.businessName ?? 'Business'}
                  </Text>
                </View>
              </View>
              <Icon name="chevR" size={18} color={colors.text3} />
            </View>
          </Card>
        )}

        {/* Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Badge status={overdue ? 'Overdue' : a.status} />
          {campaign?.deadline && (
            <Text style={{ fontSize: 13, color: overdue ? colors.danger : colors.text2 }}>
              {formatCountdown(campaign.deadline)}
            </Text>
          )}
          {campaign && (
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.money, marginLeft: 'auto' }}>
              {formatReward(campaign.reward)}
            </Text>
          )}
        </View>

        {/* Your pitch */}
        {a.pitch ? (
          <Section title="Your pitch" colors={colors}>
            <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 21 }}>{a.pitch}</Text>
          </Section>
        ) : null}

        {/* Submission */}
        {submitted ? (
          <Section title="Your submission" colors={colors}>
            <Card padding={14}>
              <View style={{ gap: 12 }}>
                <Row icon="link" colors={colors}>
                  <Button variant="ghost" size="sm" icon="arrowUR" onPress={() => openLink(a.submissionLink)}>
                    View submitted post
                  </Button>
                </Row>
                {a.submissionProof && (
                  <CoverImage src={a.submissionProof} category="Other" radius={12} style={{ width: 130, height: 162 }} />
                )}
                {a.submissionNote ? (
                  <Text style={{ fontSize: 13.5, color: colors.text2, lineHeight: 20 }}>{a.submissionNote}</Text>
                ) : null}
                <Text style={{ fontSize: 12, color: colors.text3 }}>Submitted {formatRelativeTime(a.submittedAt!)}</Text>
              </View>
            </Card>
          </Section>
        ) : null}

        {/* Brand note */}
        {a.businessNote ? (
          <Section title="Note from the brand" colors={colors}>
            <View style={{ backgroundColor: colors.warnSoft, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21 }}>{a.businessNote}</Text>
            </View>
          </Section>
        ) : null}

        {a.status === 'Completed' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="checkcircle" size={18} color={colors.success} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
              Verified & completed{a.verifiedAt ? ` · ${formatRelativeTime(a.verifiedAt)}` : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      {(canSubmit || a.status === 'Completed') && (
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
          }}
        >
          {canSubmit ? (
            <Button
              block
              icon={submitted ? 'edit' : 'upload'}
              onPress={() =>
                router.push({ pathname: '/(creator)/collabs/[applicationId]/submit', params: { applicationId: a._id } })
              }
            >
              {submitted ? 'Update submission' : 'Submit content'}
            </Button>
          ) : (
            <Button block variant="outline" icon="arrowUR" onPress={() => openLink(a.submissionLink)}>
              View your post
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, colors, children }: { icon: IconName; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={colors.text3} />
      {children}
    </View>
  );
}
