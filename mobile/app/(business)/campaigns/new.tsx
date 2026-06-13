/**
 * New campaign (PRD §7.4). The 7-step create flow — basics, cover image, location
 * toggle, reward, deliverables builder, settings (DateTimePicker + tags), and a
 * review that either saves a Draft or publishes straight to Active. On success it
 * pops back to the campaigns tab, which re-pulls on focus.
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CampaignFormScreen, emptyCampaignForm, toCampaignPayload } from '@/components/campaign';
import { api, isApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function NewCampaignScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);

  const create = async (payload: ReturnType<typeof toCampaignPayload>, status: 'Draft' | 'Active') => {
    setSubmitting(true);
    try {
      await api.post('/campaigns', { ...payload, status });
      router.back();
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Could not save', isApiError(err) ? err.message : 'Could not create the campaign.');
    }
  };

  return (
    <CampaignFormScreen
      title="New campaign"
      mode="create"
      initial={emptyCampaignForm()}
      businessName={user?.name}
      submitting={submitting}
      onSubmit={(payload, status) => {
        void create(payload, status);
      }}
    />
  );
}
