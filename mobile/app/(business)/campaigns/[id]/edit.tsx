/**
 * Edit campaign (PRD §7.4). The same 7-step form, pre-populated from the existing
 * campaign. Saving issues a partial `PUT /api/campaigns/:id` (status is managed
 * separately via the pause/close controls, so it isn't part of this payload).
 */
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '@/components/shared';
import { CampaignFormScreen, fromCampaign, toCampaignPayload } from '@/components/campaign';
import { SkeletonCard, ErrorState } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { Campaign, BusinessProfile } from '@/types';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };

export default function EditCampaignScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(business)/(tabs)/campaigns');
  };

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ campaign: CampaignWithBusiness }>(`/campaigns/${id}`);
    return res.campaign;
  }, [id]);

  const save = async (payload: ReturnType<typeof toCampaignPayload>) => {
    setSubmitting(true);
    try {
      // The payload carries no status — the campaign keeps its current status,
      // which is changed only through the pause/close controls (PRD §12).
      await api.put(`/campaigns/${id}`, payload);
      dismiss();
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Could not save', isApiError(err) ? err.message : 'Could not update the campaign.');
    }
  };

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Edit campaign" onBack={dismiss} variant="card" />
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
        <Header title="Edit campaign" onBack={dismiss} variant="card" />
        <ErrorState body={error ?? 'Campaign not found.'} onRetry={reload} />
      </View>
    );
  }

  return (
    <CampaignFormScreen
      title="Edit campaign"
      mode="edit"
      initial={fromCampaign(data)}
      businessName={data.business?.businessName}
      submitting={submitting}
      onSubmit={(payload) => {
        void save(payload);
      }}
    />
  );
}
