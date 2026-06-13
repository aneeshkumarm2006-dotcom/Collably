/**
 * Submission review card for the business (PRD §7.4 submissions). Shows who
 * submitted, the posted link, a proof screenshot, and the creator's note, with the
 * three verify actions: Verify, Request Revision, Mark Failed. Actions are wired by
 * the screen via callbacks; while one is in flight pass `busy` to lock the row.
 *
 * Only renders the action bar when the application is awaiting review (a submitted,
 * still-Accepted application). Completed/cancelled rows show a status badge instead.
 */
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { formatRelativeTime } from '@/lib/utils';
import type { Application } from '@/types';
import { Avatar, Badge, Button, Icon, RemoteImage } from '@/components/ui';

export type SubmissionCardProps = {
  application: Application;
  creatorName: string;
  creatorAvatar?: string | null;
  /** Open the posted content (expo-web-browser). */
  onOpenLink?: (url: string) => void;
  /** Tap the proof image to view it full-screen. */
  onViewProof?: (url: string) => void;
  onVerify?: () => void;
  onRequestRevision?: () => void;
  onMarkFailed?: () => void;
  busy?: boolean;
};

export function SubmissionCard({
  application,
  creatorName,
  creatorAvatar,
  onOpenLink,
  onViewProof,
  onVerify,
  onRequestRevision,
  onMarkFailed,
  busy,
}: SubmissionCardProps) {
  const { colors, shadows } = useTheme();
  const awaitingReview = application.status === 'Accepted' && !!application.submittedAt;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        padding: 14,
        ...shadows.card,
      }}
    >
      {/* header: creator + when */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar src={creatorAvatar} name={creatorName} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            {creatorName}
          </Text>
          {application.submittedAt && (
            <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>
              Submitted {formatRelativeTime(application.submittedAt)}
            </Text>
          )}
        </View>
        {!awaitingReview && <Badge status={application.status} />}
      </View>

      {/* posted link */}
      {application.submissionLink && (
        <Pressable
          onPress={() => onOpenLink?.(application.submissionLink!)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            backgroundColor: colors.cardSunk,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Icon name="link" size={16} color={colors.accent} strokeWidth={1.8} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, color: colors.accent }}>
            {application.submissionLink}
          </Text>
          <Icon name="arrowUR" size={15} color={colors.text3} strokeWidth={1.8} />
        </Pressable>
      )}

      {/* proof screenshot */}
      {application.submissionProof && (
        <Pressable onPress={() => onViewProof?.(application.submissionProof!)} style={{ marginTop: 12 }}>
          <RemoteImage
            source={{ uri: application.submissionProof }}
            style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: colors.cardSunk }}
            contentFit="cover"
            transition={150}
            recyclingKey={application.submissionProof}
          />
        </Pressable>
      )}

      {/* creator note */}
      {application.submissionNote && (
        <Text style={{ fontSize: 13.5, color: colors.text2, marginTop: 12, lineHeight: 19 }}>
          “{application.submissionNote}”
        </Text>
      )}

      {/* verify actions */}
      {awaitingReview && (
        <View style={{ marginTop: 14, gap: 10 }}>
          <Button block variant="success" icon="checkcircle" loading={busy} onPress={onVerify}>
            Verify collab
          </Button>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button block variant="outline" icon="rotate" disabled={busy} onPress={onRequestRevision}>
                Revision
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button block variant="danger" icon="x" disabled={busy} onPress={onMarkFailed}>
                Mark failed
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
