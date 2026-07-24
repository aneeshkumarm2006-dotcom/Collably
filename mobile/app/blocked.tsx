/**
 * Blocked accounts — the unblock surface.
 *
 * Both stores expect blocking to be reversible by the user without contacting
 * support, and `SafetyMenu`'s block confirmation points here by name ("Settings →
 * Blocked accounts"), so this screen is part of that contract rather than a nice
 * to have.
 *
 * Shared by both roles: blocking is account-level, so there is no creator/business
 * variant and this lives at the app root rather than under a role group.
 */
import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '@/components/shared';
import { Avatar, Button, EmptyState, ErrorState, SkeletonListItem } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';

type BlockedAccount = {
  userId: string;
  name: string;
  avatar: string | null;
  role: string;
  blockedAt: string;
};

export default function BlockedAccountsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<BlockedAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-row busy so unblocking one account doesn't freeze the whole list.
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ blocks: BlockedAccount[] }>('/blocks');
      setRows(data.blocks);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load your blocked accounts.');
    }
  }, []);

  // Refetch on focus: a block filed from a chat thread should be here on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const unblock = async (row: BlockedAccount) => {
    setBusyId(row.userId);
    try {
      await api.delete(`/blocks/${row.userId}`);
      setRows((prev) => (prev ?? []).filter((r) => r.userId !== row.userId));
      showToast({ message: `${row.name} is unblocked.`, type: 'success' });
    } catch (err) {
      showToast({
        message: isApiError(err) ? err.message : 'Could not unblock that account.',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Blocked accounts" onBack={() => router.back()} variant="card" />

      {error ? (
        <ErrorState body={error} onRetry={() => void load()} />
      ) : rows === null ? (
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="ban"
          title="No blocked accounts"
          body="When you block someone, they'll show up here so you can undo it."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 14,
                backgroundColor: colors.bgElev,
                borderWidth: 1,
                borderColor: colors.hair,
              }}
            >
              <Avatar src={item.avatar} name={item.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>
                  You can't message each other
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                loading={busyId === item.userId}
                onPress={() => void unblock(item)}
              >
                Unblock
              </Button>
            </View>
          )}
        />
      )}
    </View>
  );
}
