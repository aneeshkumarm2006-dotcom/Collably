/**
 * Submit content for an accepted collab (PRD §7.3, §11). The creator posts the
 * live content link, an optional screenshot proof (→ Cloudinary), and a note, then
 * confirms the brand's terms before `POST /api/applications/:id/submit`. Reachable
 * for an Accepted (or Overdue) collab; for a revision it re-submits the same way.
 */
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '@/components/shared';
import { FormBanner } from '@/components/auth';
import { CoverImage } from '@/components/campaign/CoverImage';
import {
  Button,
  Field,
  TextField,
  TextArea,
  SwitchRow,
  Icon,
  SkeletonCard,
  ErrorState,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import type { Application, Campaign, BusinessProfile } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };

export default function SubmitContentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ application: AppWithRefs }>(`/applications/${applicationId}`);
    return res.application;
  }, [applicationId]);

  const [link, setLink] = useState('');
  const [proof, setProof] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addProof = async () => {
    setFormError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage('submissions', { aspect: [4, 5] });
      if (url) setProof(url);
    } catch (err) {
      if (err instanceof ImagePermissionError) setFormError(err.message);
      else if (isApiError(err)) setFormError(err.message);
      else setFormError('Could not upload that screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!link.trim()) {
      setFormError('Add the link to your published content.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post(`/applications/${applicationId}/submit`, {
        submissionLink: link.trim(),
        ...(proof ? { submissionProof: proof } : {}),
        ...(note.trim() ? { submissionNote: note.trim() } : {}),
      });
      router.back();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not submit. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Submit content" onBack={() => router.back()} variant="card" />
        <View style={{ padding: 16 }}>
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Submit content" onBack={() => router.back()} variant="card" />
        <ErrorState body={error ?? 'Collab not found.'} onRetry={reload} />
      </View>
    );
  }

  const campaign = data.campaign;
  const submittable = data.status === 'Accepted' || data.status === 'Overdue';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Submit content" onBack={() => router.back()} variant="card" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Campaign summary */}
        {campaign && (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              borderRadius: 14,
              padding: 12,
              marginBottom: 18,
            }}
          >
            <CoverImage src={campaign.coverImage} category={campaign.category} radius={10} style={{ width: 56, height: 56 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {campaign.title}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2, marginTop: 2 }}>
                {campaign.business?.businessName ?? 'Business'}
              </Text>
            </View>
          </View>
        )}

        {!submittable && (
          <View style={{ marginBottom: 16 }}>
            <FormBanner message={`This collab is ${data.status} — there's nothing to submit right now.`} />
          </View>
        )}

        {formError && <View style={{ marginBottom: 4 }}><FormBanner message={formError} /></View>}

        <Field label="Content link" hint="Paste the public URL of your published post, reel, or video.">
          <TextField
            value={link}
            onChangeText={setLink}
            placeholder="https://instagram.com/p/…"
            keyboardType="url"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Screenshot proof (optional)" hint="Helps the brand verify quickly if your post is later edited or removed.">
          {proof ? (
            <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <CoverImage src={proof} category="Other" radius={12} style={{ width: 120, height: 150 }} />
              <Button variant="outline" size="sm" icon="refresh" onPress={addProof}>
                Replace
              </Button>
            </View>
          ) : (
            <Button variant="outline" icon="upload" loading={uploading} onPress={addProof}>
              Upload screenshot
            </Button>
          )}
        </Field>

        <Field label="Note to the brand (optional)">
          <TextArea
            value={note}
            onChangeText={setNote}
            placeholder="Anything the brand should know about your submission…"
            maxLength={1000}
          />
        </Field>

        <View style={{ marginTop: 4, marginBottom: 18 }}>
          <SwitchRow
            label="I confirm this content meets the brief"
            hint="The post is live, follows the deliverables, and complies with the brand's guidelines."
            value={agreed}
            onValueChange={setAgreed}
          />
        </View>

        <Button block loading={submitting} disabled={!submittable || !agreed} onPress={submit}>
          Submit for review
        </Button>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          <Icon name="lock" size={14} color={colors.text3} />
          <Text style={{ fontSize: 12, color: colors.text3 }}>The brand reviews your submission before it's verified.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
