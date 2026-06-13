/**
 * Step 2 — Cover image (PRD §7.4). Optional: shows a live preview using the same
 * `CoverImage` (so the category gradient fallback matches the published card).
 * Image picking + Cloudinary upload is wired by the screen (Phase 11/16) and
 * passed in via `onPickImage`; this step just renders state.
 */
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui';
import { CoverImage } from '../CoverImage';
import { Field } from './fields';
import type { CampaignStepProps } from './Step1';

export type Step2Props = CampaignStepProps & {
  /** Open the image picker → upload → `patch({ coverImage })`. Provided by screen. */
  onPickImage?: () => void;
  /** True while an upload is in flight. */
  uploading?: boolean;
};

export function Step2({ value, patch, onPickImage, uploading }: Step2Props) {
  const { colors } = useTheme();
  const hasCover = !!value.coverImage;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      <Field label="Cover image" hint="A bright, real photo performs best. Skip it and we'll use a branded gradient.">
        <CoverImage
          src={value.coverImage}
          category={value.category ?? 'Other'}
          radius={16}
          style={{ aspectRatio: 16 / 10, borderWidth: 1, borderColor: colors.hair }}
        >
          {!hasCover && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' }}>No image yet</Text>
            </View>
          )}
        </CoverImage>
      </Field>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="solid" icon="camera" loading={uploading} onPress={onPickImage}>
          {hasCover ? 'Replace image' : 'Choose image'}
        </Button>
        {hasCover && !uploading && (
          <Button variant="outline" icon="trash" onPress={() => patch({ coverImage: null })}>
            Remove
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
