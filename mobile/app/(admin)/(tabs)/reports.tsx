/**
 * Admin reports (PRD §7.5, §14). The moderation queue of user-filed reports against
 * campaigns, businesses, creators, or users — filterable by review status. Open
 * reports can be dismissed or marked actioned (the actual moderation — suspend /
 * ban / force-close — is carried out on the matching Manage surface, reachable via
 * the "Review target" link). Status changes are optimistic and revert on failure.
 *
 *   GET   /api/admin/reports?status=
 *   PATCH /api/admin/reports/:id   { status: 'dismissed' | 'actioned' }
 */
import { useCallback, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, SkeletonCard, TagChip, type BadgeTone, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatRelativeTime } from '@/lib/utils';
import type { ReportStatus, ReportTargetType } from '@/constants';
import type { Report } from '@/types';

const TABS: { key: string; label: string; status?: ReportStatus }[] = [
  { key: 'open', label: 'Open', status: 'open' },
  { key: 'actioned', label: 'Actioned', status: 'actioned' },
  { key: 'dismissed', label: 'Dismissed', status: 'dismissed' },
  { key: 'all', label: 'All' },
];

const TARGET_ICON: Record<ReportTargetType, IconName> = {
  campaign: 'briefcase',
  business: 'store',
  creator: 'person',
  user: 'users',
};

const STATUS_TONE: Record<ReportStatus, BadgeTone> = { open: 'warn', actioned: 'success', dismissed: 'muted' };

/** Where to go to act on a report of this target type. */
const TARGET_ROUTE: Record<ReportTargetType, Href> = {
  campaign: '/(admin)/(tabs)/campaigns',
  business: '/(admin)/businesses',
  creator: '/(admin)/creators',
  user: '/(admin)/(tabs)/users',
};

export default function AdminReportsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('open');

  const active = TABS.find((t) => t.key === tab)!;

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const params: Record<string, string> = { limit: '50' };
    if (active.status) params.status = active.status;
    const { data: res } = await api.get<{ data: Report[] }>('/admin/reports', { params });
    return res.data;
  }, [tab]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const resolve = async (r: Report, status: 'dismissed' | 'actioned') => {
    const prev = data;
    // Drop it from the open view (and update its badge in the others) optimistically.
    setData((list) =>
      list
        ? tab === 'open'
          ? list.filter((x) => x._id !== r._id)
          : list.map((x) => (x._id === r._id ? { ...x, status } : x))
        : list,
    );
    try {
      await api.patch(`/admin/reports/${r._id}`, { status });
    } catch (err) {
      setData(prev ?? null);
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
    }
  };

  const confirmAction = (r: Report) => {
    Alert.alert(
      'Mark as actioned?',
      `Confirm you've moderated this ${r.targetType}. Use "Review target" first if you still need to suspend, ban, or close it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark actioned', onPress: () => void resolve(r, 'actioned') },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Reports" large />

      {/* Status tabs */}
      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, backgroundColor: colors.bgElev }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <TagChip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>

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
          data={data ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    backgroundColor: colors.cardSunk,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={TARGET_ICON[item.targetType]} size={19} color={colors.text2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>
                    {item.targetType} report
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
                <Badge tone={STATUS_TONE[item.status]} label={item.status} />
              </View>

              <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20 }}>{item.reason}</Text>

              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Button variant="ghost" size="sm" icon={TARGET_ICON[item.targetType]} onPress={() => router.push(TARGET_ROUTE[item.targetType])}>
                  Review target
                </Button>
                {item.status === 'open' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                    <Button variant="outline" size="sm" onPress={() => void resolve(item, 'dismissed')}>
                      Dismiss
                    </Button>
                    <Button variant="solid" size="sm" onPress={() => confirmAction(item)}>
                      Mark actioned
                    </Button>
                  </View>
                )}
              </View>
            </Card>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="flag"
              title={tab === 'open' ? 'Queue is clear' : 'Nothing here'}
              body={tab === 'open' ? 'There are no open reports to review right now.' : 'No reports with this status.'}
            />
          }
        />
      )}
    </View>
  );
}
