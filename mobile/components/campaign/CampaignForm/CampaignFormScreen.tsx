/**
 * The full 7-step campaign create/edit flow as a stack screen (PRD §7.4). Owns the
 * `CampaignFormState`, drives the stepper chrome (Header + StepperProgress + pinned
 * Back/Continue footer for steps 1–6), wires the cover-image picker → Cloudinary,
 * and hands the mapped payload back to the caller on the final Review step.
 *
 * Used by both `(business)/campaigns/new` (create: Save Draft / Publish) and
 * `(business)/campaigns/[id]/edit` (edit: a single Save changes). The terminal
 * actions live on Step 7 itself; this screen hides its pinned footer there so
 * Step 7's inline buttons take over.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/ThemeProvider';
import { Header, StepperProgress } from '@/components/shared';
import { FormBanner } from '@/components/auth';
import { Button } from '@/components/ui';
import { pickAndUploadImage, ImagePermissionError } from '@/lib/imageUpload';
import { isApiError } from '@/lib/api';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { Step5 } from './Step5';
import { Step6 } from './Step6';
import { Step7 } from './Step7';
import {
  CAMPAIGN_STEP_COUNT,
  CAMPAIGN_STEP_TITLES,
  validateStep,
  toCampaignPayload,
  type CampaignFormState,
} from './formState';

export type CampaignFormScreenProps = {
  title: string;
  initial: CampaignFormState;
  businessName?: string;
  mode: 'create' | 'edit';
  submitting?: boolean;
  /**
   * Whether the business may publish (Active). When false (unverified business),
   * Step 7 hides the Publish action and only offers Save as draft. Defaults to true
   * (e.g. the edit flow, which doesn't publish). Server-side checks also enforce this.
   */
  canPublish?: boolean;
  /** Map of the final form → request body (already built by `toCampaignPayload`). */
  onSubmit: (payload: ReturnType<typeof toCampaignPayload>, status: 'Draft' | 'Active') => void;
};

export function CampaignFormScreen({
  title,
  initial,
  businessName,
  mode,
  submitting,
  canPublish = true,
  onSubmit,
}: CampaignFormScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CampaignFormState>(initial);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<CampaignFormState>) => setForm((f) => ({ ...f, ...partial }));

  const pickCover = async () => {
    setError(null);
    setCoverUploading(true);
    try {
      const url = await pickAndUploadImage('campaigns', { aspect: [16, 10] });
      if (url) patch({ coverImage: url });
    } catch (err) {
      if (err instanceof ImagePermissionError) setError(err.message);
      else if (isApiError(err)) setError(err.message);
      else setError('Could not upload that image. Please try again.');
    } finally {
      setCoverUploading(false);
    }
  };

  const isLastStep = step === CAMPAIGN_STEP_COUNT;
  const canAdvance = validateStep(step, form) && !coverUploading;

  const goNext = () => {
    if (!canAdvance) return;
    setError(null);
    setStep((s) => Math.min(s + 1, CAMPAIGN_STEP_COUNT));
  };
  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(business)/(tabs)/campaigns');
  };
  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
    else dismiss();
  };

  const submit = (status: 'Draft' | 'Active') => onSubmit(toCampaignPayload(form), status);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={title} onBack={dismiss} variant="card" />

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <StepperProgress current={step} total={CAMPAIGN_STEP_COUNT} stepTitle={CAMPAIGN_STEP_TITLES[step - 1]} />
      </View>

      {error && (
        <View style={{ paddingHorizontal: 16 }}>
          <FormBanner message={error} />
        </View>
      )}

      {/* Step body — each step brings its own ScrollView. */}
      <View style={{ flex: 1 }}>
        {step === 1 && <Step1 value={form} patch={patch} />}
        {step === 2 && <Step2 value={form} patch={patch} onPickImage={pickCover} uploading={coverUploading} />}
        {step === 3 && <Step3 value={form} patch={patch} />}
        {step === 4 && <Step4 value={form} patch={patch} />}
        {step === 5 && <Step5 value={form} patch={patch} />}
        {step === 6 && <Step6 value={form} patch={patch} />}
        {step === 7 && (
          <Step7
            value={form}
            businessName={businessName}
            submitting={submitting}
            canPublish={canPublish}
            primaryLabel={mode === 'edit' ? 'Save changes' : 'Publish campaign'}
            showSaveDraft={mode === 'create'}
            onSaveDraft={() => submit('Draft')}
            onPublish={() => submit('Active')}
          />
        )}
      </View>

      {/* Pinned footer for steps 1–6 (Step 7 renders its own terminal actions). */}
      {!isLastStep && (
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: colors.hair,
            backgroundColor: colors.bgElev,
          }}
        >
          <View style={{ flexShrink: 0 }}>
            <Button variant="outline" icon="chevL" onPress={goBack}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button block disabled={!canAdvance} onPress={goNext}>
              Continue
            </Button>
          </View>
        </View>
      )}

      {/* On the review step, a slim "back to edit" control under the inline actions. */}
      {isLastStep && (
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 10, paddingTop: 4, backgroundColor: colors.bg }}>
          <Button variant="ghost" icon="chevL" block disabled={submitting} onPress={goBack}>
            Back to edit
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
