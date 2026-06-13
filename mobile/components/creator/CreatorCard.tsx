/**
 * Creator profile summary card (PRD §7.4 applicant lists, §7.3 public profiles).
 * Avatar + name, niche chips, a follower/engagement line, and completed-collabs
 * stat. Pass `footer` to inject actions (e.g. Accept/Reject when a business reviews
 * an applicant) and `onPress` to open the full profile.
 */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { formatCompactNumber } from '@/lib/utils';
import type { CreatorProfile } from '@/types';
import { Avatar, Card, Icon, TagChip, type IconName } from '@/components/ui';

export type CreatorCardProps = {
  creator: CreatorProfile;
  /** Display name (from the linked User). */
  name: string;
  avatar?: string | null;
  onPress?: () => void;
  /** Action area rendered at the bottom (buttons, etc.). */
  footer?: React.ReactNode;
};

/** Total reach across the creator's connected handles. */
function totalReach(c: CreatorProfile): number {
  const ig = c.socialHandles.instagram?.followerCount ?? 0;
  const yt = c.socialHandles.youtube?.subscriberCount ?? 0;
  const tt = c.socialHandles.tiktok?.followerCount ?? 0;
  return ig + yt + tt;
}

export function CreatorCard({ creator, name, avatar, onPress, footer }: CreatorCardProps) {
  const { colors } = useTheme();
  const reach = totalReach(creator);
  const platforms: { icon: IconName; key: string }[] = [];
  if (creator.socialHandles.instagram) platforms.push({ icon: 'instagram', key: 'ig' });
  if (creator.socialHandles.youtube) platforms.push({ icon: 'youtube', key: 'yt' });
  if (creator.socialHandles.tiktok) platforms.push({ icon: 'play', key: 'tt' });

  return (
    <Card onPress={onPress} padding={14}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar src={avatar} name={name} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
              {name}
            </Text>
            {creator.isUGCOnly && <TagChip label="UGC" small />}
          </View>

          {/* reach + platforms */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {reach > 0 ? (
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>
                {formatCompactNumber(reach)} <Text style={{ fontWeight: '400', color: colors.text3 }}>reach</Text>
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: colors.text3 }}>UGC creator</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {platforms.map((p) => (
                <Icon key={p.key} name={p.icon} size={15} color={colors.text3} strokeWidth={1.7} />
              ))}
            </View>
          </View>

          {creator.location.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Icon name="mappin" size={13} color={colors.text3} strokeWidth={1.7} />
              <Text style={{ fontSize: 12.5, color: colors.text3 }}>{creator.location.city}</Text>
            </View>
          )}
        </View>
      </View>

      {/* niches */}
      {creator.niche.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {creator.niche.slice(0, 4).map((n) => (
            <TagChip key={n} label={n} small />
          ))}
          {creator.niche.length > 4 && <TagChip label={`+${creator.niche.length - 4}`} small />}
        </View>
      )}

      {/* completed collabs */}
      {creator.totalCollabsCompleted > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
          <Icon name="checkcircle" size={15} color={colors.success} strokeWidth={1.8} />
          <Text style={{ fontSize: 12.5, color: colors.text2 }}>
            {creator.totalCollabsCompleted} collab{creator.totalCollabsCompleted === 1 ? '' : 's'} completed
          </Text>
        </View>
      )}

      {footer && <View style={{ marginTop: 14 }}>{footer}</View>}
    </Card>
  );
}
