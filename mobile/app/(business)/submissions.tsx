/**
 * Submissions review (PRD §7.4, §11). Every content submission across the business's
 * campaigns — awaiting-review ones first — each rendered as a `SubmissionCard` with
 * the posted link, a tappable full-screen proof, the creator's note, and the three
 * verify actions: Verify, Request Revision, Mark Failed. Revision/Fail collect an
 * optional note in a sheet. Opened directly or via a `submission_received` deep link
 * (`?applicationId=`), which floats that submission to the top.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/shared';
import { SubmissionCard } from '@/components/business';
import {
  Button,
  EmptyState,
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
import type { Application, UserSummary } from '@/types';

type SubmissionApp = Application & { creatorUser?: UserSummary | null };

/** Awaiting-review (Accepted + submitted) sorts above already-reviewed rows. */
function reviewRank(a: SubmissionApp): number {
  if (a.status === 'Accepted' && a.submittedAt) return 0;
  return 1;
}

export default function SubmissionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { applicationId } = useLocalSearchParams<{ applicationId?: string }>();

  const noteRef = useRef<BottomSheetRef>(null);
  const [pending, setPending] = useState<{ app: SubmissionApp; action: 'revision' | 'fail' } | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: SubmissionApp[] }>('/applications', {
      params: { status: 'Accepted,Overdue,Completed,Cancelled', limit: 100 },
    });
    // Only rows that actually carry a submission.
    return res.data.filter((a) => !!a.submittedAt || !!a.submissionLink);
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const items = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      // Deep-linked submission first, then awaiting-review, then the rest.
      if (applicationId) {
        if (a._id === applicationId) return -1;
        if (b._id === applicationId) return 1;
      }
      return reviewRank(a) - reviewRank(b);
    });
    return list;
  }, [data, applicationId]);

  const awaitingCount = (data ?? []).filter((a) => a.status === 'Accepted' && a.submittedAt).length;

  const runVerify = async (app: SubmissionApp, action: 'verify' | 'revision' | 'fail', n?: string) => {
    setBusyId(app._id);
    try {
      await api.patch(`/applications/${app._id}/verify`, { action, ...(n?.trim() ? { note: n.trim() } : {}) });
      await reload();
    } catch (err) {
      Alert.alert('Could not submit', isApiError(err) ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const onVerify = (app: SubmissionApp) => {
    Alert.alert('Verify collab?', 'This marks the collab complete and confirms the reward.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', onPress: () => void runVerify(app, 'verify') },
    ]);
  };

  const openNoteSheet = (app: SubmissionApp, action: 'revision' | 'fail') => {
    setPending({ app, action });
    setNote('');
    noteRef.current?.present();
  };

  const submitNote = async () => {
    if (!pending) return;
    const { app, action } = pending;
    noteRef.current?.dismiss();
    setPending(null);
    await runVerify(app, action, note);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Submissions"
        subtitle={awaitingCount > 0 ? `${awaitingCount} awaiting review` : undefined}
        onBack={() => router.back()}
        variant="card"
      />

      {loading && !data ? (
        <View style={{ padding: 16, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error && !data ? (
        <ErrorState body={error} onRetry={reload} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SubmissionCard
              application={item}
              creatorName={item.creatorUser?.name ?? 'Creator'}
              creatorAvatar={item.creatorUser?.avatar}
              busy={busyId === item._id}
              onOpenLink={(url) => void WebBrowser.openBrowserAsync(url)}
              onViewProof={(url) => setProof(url)}
              onVerify={() => onVerify(item)}
              onRequestRevision={() => openNoteSheet(item, 'revision')}
              onMarkFailed={() => openNoteSheet(item, 'fail')}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="upload"
              title="No submissions yet"
              body="When accepted creators submit their content, it shows up here for you to review."
            />
          }
        />
      )}

      {/* Revision / fail note sheet */}
      <BottomSheet ref={noteRef} title={pending?.action === 'fail' ? 'Mark as failed' : 'Request a revision'} snapPoints={['54%']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>
            {pending?.action === 'fail'
              ? "Let the creator know why this collab didn't work out (optional)."
              : 'Tell the creator what to change. They can resubmit after revising (optional).'}
          </Text>
          <TextArea value={note} onChangeText={setNote} placeholder="Add a note…" maxLength={1000} />
          <Button
            block
            variant={pending?.action === 'fail' ? 'danger' : 'solid'}
            icon={pending?.action === 'fail' ? 'x' : 'rotate'}
            loading={!!pending && busyId === pending.app._id}
            onPress={submitNote}
          >
            {pending?.action === 'fail' ? 'Mark failed' : 'Request revision'}
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
            <RemoteImage source={{ uri: proof }} style={{ width: '100%', height: '80%' }} contentFit="contain" transition={150} recyclingKey={proof} />
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
