/**
 * Business profile summary card (PRD §7.3 public business profile, §7.4 profile
 * tab). Logo + name with a verified check, category, location, and a campaigns /
 * collabs stat line. Pass `footer` for actions and `onPress` to open the profile.
 */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import type { BusinessProfile } from '@/types';
import { Avatar, Card, Icon } from '@/components/ui';

export type BusinessCardProps = {
  business: BusinessProfile;
  onPress?: () => void;
  footer?: React.ReactNode;
};

export function BusinessCard({ business, onPress, footer }: BusinessCardProps) {
  const { colors } = useTheme();
  const location = [business.location.city, business.location.state].filter(Boolean).join(', ');

  return (
    <Card onPress={onPress} padding={14}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar src={business.logo} name={business.businessName} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
              {business.businessName}
            </Text>
            {business.isVerified && <Icon name="badge" size={16} color={colors.accent} strokeWidth={1.8} />}
          </View>
          <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>{business.category}</Text>
          {!!location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Icon name="mappin" size={13} color={colors.text3} strokeWidth={1.7} />
              <Text style={{ fontSize: 12.5, color: colors.text3 }}>{location}</Text>
            </View>
          )}
        </View>
      </View>

      {/* stats */}
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
        <Stat value={business.totalCampaigns} label="Campaigns" colors={colors} />
        <Stat value={business.totalCollabsCompleted} label="Collabs done" colors={colors} />
      </View>

      {footer && <View style={{ marginTop: 14 }}>{footer}</View>}
    </Card>
  );
}

function Stat({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12.5, color: colors.text3 }}>{label}</Text>
    </View>
  );
}
