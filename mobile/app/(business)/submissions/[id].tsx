/**
 * Submission detail (PRD §7.4, §11) — the full-page review of ONE creator's
 * submission. Reached from the submissions list, the applications tab, and the
 * `submission_received` deep link. Shows the creator, the posted link, a large
 * tappable proof, and the creator's note, with the three clearly-scoped actions:
 * Verify collab, Request revision, and Cancel collab.
 *
 * Cancel is deliberately single-collab: it calls POST /applications/:id/cancel,
 * which only cancels THIS creator's collab and never touches the campaign or the
 * other applicants. It is not the campaign-level Close/Delete.
 */
import { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/shared';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  Icon,
  RemoteImage,
  SkeletonCard,
  TextArea,
  BottomSheet,
  type BottomSheetRef,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatRelativeTime } from '@/lib/utils';
import type { Application, Campaign, UserSummary } from '@/types';

type SubmissionApp = Application & { creatorUser?: UserSummary | null; campaign?: Campaign };

export default function SubmissionDetailScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const noteRef = useRef<BottomSheetRef>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ application: SubmissionApp }>(`/applications/${id}`);
    return res.application;
  }, [id]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const app = data;
  const creatorName = app?.creatorUser?.name ?? 'Creator';
  const awaitingReview = app?.status === 'Accepted' && !!app?.submittedAt;

  const runVerify = async (action: 'verify' | 'revision', n?: string) => {
    if (!app) return;
    setBusy(true);
    try {
      await api.patch(`/applications/${app._id}/verify`, {
        action,
        ...(n?.trim() ? { note: n.trim() } : {}),
      });
      await reload();
    } catch (err) {
      Alert.alert('Could not submit', isApiError(err) ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onVerify = () => {
    Alert.alert('Verify collab?', 'This marks the collab complete and confirms the reward.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', onPress: () => void runVerify('verify') },
    ]);
  };

  const openRevisionSheet = () => {
    setNote('');
    noteRef.current?.present();
  };

  const submitRevision = async () => {
    noteRef.current?.dismiss();
    await runVerify('revision', note);
  };

  /**
   * Cancel ONLY this creator's collab. The confirm copy makes the scope explicit —
   * it is not "Close campaign" — and it calls the single-application cancel
   * endpoint, so the campaign and the other applicants are never affected.
   */
  const onCancelCollab = () => {
    if (!app) return;
    Alert.alert(
      "Cancel this creator's collab?",
      `This cancels ${creatorName}'s collab only. Your campaign and any other creators are not affected. The creator will be notified.`,
      [
        { text: 'Keep collab', style: 'cancel' },
        {
          text: 'Cancel collab',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.post(`/applications/${app._id}/cancel`);
              await reload();
            } catch (err) {
              Alert.alert('Could not cancel', isApiError(err) ? err.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Submission" onBack={() => router.back()} variant="card" />

      {loading && !data ? (
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonCard />
        </View>
      ) : error && !data ? (
        <ErrorState body={error} onRetry={reload} />
      ) : app ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* creator + status */}
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              ...shadows.card,
            }}
          >
            <Avatar src={app.creatorUser?.avatar} name={creatorName} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {creatorName}
              </Text>
              {app.submittedAt ? (
                <Text style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>
                  Submitted {formatRelativeTime(app.submittedAt)}
                </Text>
              ) : (
                app.campaign?.title && (
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>
                    {app.campaign.title}
                  </Text>
                )
              )}
            </View>
            {!awaitingReview && <Badge status={app.status} />}
          </View>

          {/* posted link */}
          {app.submissionLink && (
            <Pressable
              onPress={() => void WebBrowser.openBrowserAsync(app.submissionLink!)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.cardSunk,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name="link" size={17} color={colors.accent} strokeWidth={1.8} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.accent }}>
                {app.submissionLink}
              </Text>
              <Icon name="arrowUR" size={16} color={colors.text3} strokeWidth={1.8} />
            </Pressable>
          )}

          {/* proof screenshot */}
          {app.submissionProof && (
            <Pressable onPress={() => setProof(app.submissionProof!)}>
              <RemoteImage
                source={{ uri: app.submissionProof }}
                style={{ width: '100%', height: 320, borderRadius: 14, backgroundColor: colors.cardSunk }}
                contentFit="cover"
                transition={150}
                recyclingKey={app.submissionProof}
              />
            </Pressable>
          )}

          {/* creator note */}
          {app.submissionNote && (
            <View
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.hair,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
                “{app.submissionNote}”
              </Text>
            </View>
          )}

          {/* actions — only while awaiting review */}
          {awaitingReview && (
            <View style={{ gap: 10, marginTop: 4 }}>
              <Button block variant="success" icon="checkcircle" loading={busy} onPress={onVerify}>
                Verify collab
              </Button>
              <Button block variant="outline" icon="rotate" disabled={busy} onPress={openRevisionSheet}>
                Request revision
              </Button>
              <Button block variant="danger" icon="x" disabled={busy} onPress={onCancelCollab}>
                Cancel collab
              </Button>
            </View>
          )}
        </ScrollView>
      ) : (
        <ErrorState body="Submission not found." onRetry={reload} />
      )}

      {/* Revision note sheet */}
      <BottomSheet ref={noteRef} title="Request a revision" snapPoints={['54%']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
            Tell the creator what to change. They can resubmit after revising (optional).
          </Text>
          <TextArea value={note} onChangeText={setNote} placeholder="Add a note…" maxLength={1000} />
          <Button block variant="solid" icon="rotate" loading={busy} onPress={submitRevision}>
            Request revision
          </Button>
        </View>
      </BottomSheet>

      {/* Full-screen proof viewer */}
      <Modal visible={!!proof} transparent animationType="fade" onRequestClose={() => setProof(null)}>
        <Pressable
          onPress={() => setProof(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {proof && (
            <RemoteImage
              source={{ uri: proof }}
              style={{ width: '100%', height: '80%' }}
              contentFit="contain"
              transition={150}
              recyclingKey={proof}
            />
          )}
          <Pressable
            onPress={() => setProof(null)}
            hitSlop={12}
            style={{ position: 'absolute', top: insets.top + 12, right: 18 }}
          >
            <Icon name="x" size={28} color="#fff" strokeWidth={2} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
