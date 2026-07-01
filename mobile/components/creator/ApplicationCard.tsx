/**
 * A creator's application/collab row (PRD §7.3 applications + collabs lists). Shows
 * the campaign cover, title, business, a status badge, the reward, and a deadline
 * countdown when the collab is active. Pass `footer` to add contextual CTAs
 * (Submit when Accepted, Withdraw when Pending, View when done).
 */
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { formatCountdown, formatReward, isOverdue } from '@/lib/utils';
import type { Application, Campaign } from '@/types';
import { Badge, Icon } from '@/components/ui';
import { CoverImage } from '../campaign/CoverImage';

export type ApplicationCardProps = {
  application: Application;
  /** The campaign this application is for (populated by the API). */
  campaign: Pick<Campaign, 'title' | 'category' | 'coverImage' | 'reward' | 'deadline'>;
  businessName?: string;
  onPress?: () => void;
  footer?: React.ReactNode;
};

export function ApplicationCard({ application, campaign, businessName, onPress, footer }: ApplicationCardProps) {
  const { colors, shadows } = useTheme();
  const showCountdown = application.status === 'Accepted';
  const overdue = showCountdown && isOverdue(campaign.deadline);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        padding: 12,
        opacity: pressed ? 0.95 : 1,
        ...shadows.card,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <CoverImage src={campaign.coverImage} category={campaign.category} radius={11} style={{ width: 64, height: 64 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
              {campaign.title}
            </Text>
            <Badge status={application.status} />
          </View>
          {businessName && (
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2, marginTop: 2 }}>
              {businessName}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 }}>
              <Icon name="gift" size={14} color={colors.money} strokeWidth={1.7} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: colors.text }}>
                {formatReward(campaign.reward)}
              </Text>
            </View>
            {showCountdown && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="clock" size={14} color={overdue ? colors.danger : colors.text3} strokeWidth={1.7} />
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: overdue ? colors.danger : colors.text2 }}>
                  {formatCountdown(campaign.deadline)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {footer && <View style={{ marginTop: 12 }}>{footer}</View>}
    </Pressable>
  );
}
