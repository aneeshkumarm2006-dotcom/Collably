/**
 * The signature campaign "ticket" card for the explore feed and campaign lists
 * (PRD §7.3, §13). Ported from the design reference's `TicketCard`: a category-
 * tinted cover with a category chip + optional status corner, the business name +
 * city, the campaign title, a meta row (platform · deliverables · deadline), and a
 * reward/applicants stub.
 *
 * `compact` renders the slim row variant used in dense lists (home feed, pickers).
 * Pass `applicationStatus` to show the viewer's own application state in the corner.
 */
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/components/ThemeProvider';
import { formatCountdown, formatCompactNumber, formatMoney } from '@/lib/utils';
import type { Campaign } from '@/types';
import type { ApplicationStatus } from '@/constants';
import { Icon, type IconName } from '@/components/ui';
import { CoverImage } from './CoverImage';

export type CampaignCardProps = {
  campaign: Campaign;
  /** Business display name (populated by the API; falls back to "Business"). */
  businessName?: string;
  /** The viewer's own application status, shown as a corner tag if set. */
  applicationStatus?: ApplicationStatus;
  compact?: boolean;
  onPress?: () => void;
};

/** Platform → icon for the meta row / cover badge. */
const PLATFORM_ICON: Record<string, IconName> = {
  Instagram: 'instagram',
  YouTube: 'youtube',
  TikTok: 'play',
  Google: 'star',
  Any: 'sparkles',
};

function rewardLabel(campaign: Campaign): string {
  const { reward } = campaign;
  if (typeof reward.estimatedValue === 'number' && reward.estimatedValue > 0) {
    return formatMoney(reward.estimatedValue);
  }
  return 'Perk';
}

function deliverableSummary(campaign: Campaign): string {
  const total = campaign.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  if (total <= 0) return 'Content';
  const first = campaign.deliverables[0];
  const type = first?.contentType ?? 'Post';
  return total === 1 ? `1 ${type}` : `${total} deliverables`;
}

export function CampaignCard({ campaign, businessName, applicationStatus, compact, onPress }: CampaignCardProps) {
  const { colors, shadows } = useTheme();
  const biz = businessName ?? 'Business';
  const city = campaign.location?.city ?? (campaign.isRemote ? 'Remote' : '');
  const platform = campaign.deliverables[0]?.platform ?? 'Any';

  if (compact) {
    return (
      <PressableScale
        onPress={onPress}
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hair,
          borderRadius: 16,
          padding: 10,
          ...shadows.card,
        }}
      >
        <CoverImage src={campaign.coverImage} category={campaign.category} radius={11} style={{ width: 62, height: 62 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {campaign.title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2, marginTop: 1 }}>
            {biz}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.money }}>{rewardLabel(campaign)}</Text>
            <Text style={{ fontSize: 11.5, color: colors.text3 }}>· {campaign.reward.type}</Text>
          </View>
        </View>
        <Icon name="chevR" size={18} color={colors.text3} />
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 18,
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <CoverImage src={campaign.coverImage} category={campaign.category} style={{ aspectRatio: 16 / 10 }}>
        {/* category chip */}
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(255,255,255,0.92)',
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1C1E21' }}>{campaign.category}</Text>
        </View>
        {/* viewer's application status corner, else platform badge */}
        {applicationStatus ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor:
                applicationStatus === 'Accepted' || applicationStatus === 'Completed'
                  ? colors.accent
                  : applicationStatus === 'Pending'
                    ? colors.warn
                    : 'rgba(20,20,30,0.66)',
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{applicationStatus}</Text>
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              top: 11,
              right: 11,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={PLATFORM_ICON[platform] ?? 'sparkles'} size={17} color="#1C1E21" />
          </View>
        )}
      </CoverImage>

      {/* body */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
            {biz}
          </Text>
          {!!city && <Text style={{ fontSize: 11, color: colors.text2 }}>{city}</Text>}
        </View>
        <Text numberOfLines={2} style={{ fontSize: 14.5, color: colors.text, marginTop: 5, lineHeight: 20 }}>
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
          <MetaChip icon={PLATFORM_ICON[platform] ?? 'sparkles'} label={platform} colors={colors} />
          <MetaChip label={deliverableSummary(campaign)} colors={colors} />
          <MetaChip icon="calendar" label={formatCountdown(campaign.deadline)} colors={colors} />
        </View>
      </View>

      {/* divider */}
      <View style={{ height: 1, backgroundColor: colors.hair, marginHorizontal: 12 }} />

      {/* stub: reward + applicants */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 13,
          paddingBottom: 15,
          gap: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, color: colors.text3, marginBottom: 2 }}>
            REWARD VALUE
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.money, letterSpacing: -0.2 }}>
            {rewardLabel(campaign)}{' '}
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text2 }}>· {campaign.reward.type}</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.accent }}>
            {formatCompactNumber(campaign.applicationsCount)} applied
          </Text>
          {typeof campaign.spotsLeft === 'number' && campaign.status === 'Active' ? (
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: campaign.spotsLeft > 0 ? colors.brandGreenText : colors.text3,
                marginTop: 1,
              }}
            >
              {campaign.spotsLeft > 0 ? `${campaign.spotsLeft} spot${campaign.spotsLeft === 1 ? '' : 's'} left` : 'Full'}
            </Text>
          ) : (
            <Text style={{ fontSize: 10.5, color: colors.text3, marginTop: 1 }}>
              {campaign.status === 'Active' ? 'Open' : campaign.status}
            </Text>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

function MetaChip({ icon, label, colors }: { icon?: IconName; label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
      }}
    >
      {icon && <Icon name={icon} size={12} color={colors.text2} strokeWidth={1.8} />}
      <Text style={{ fontSize: 11, color: colors.text2 }}>{label}</Text>
    </View>
  );
}
