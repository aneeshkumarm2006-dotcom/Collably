/**
 * Step 7 — Review (PRD §7.4). A read-only summary of the whole form with a live
 * card preview, then the two terminal actions: Save Draft and Publish. The screen
 * supplies the handlers (mapping via `toCampaignPayload`) and a `submitting` flag.
 */
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { formatDate, formatReward } from '@/lib/utils';
import { Button, Card, TagChip } from '@/components/ui';
import { CampaignCard } from '../CampaignCard';
import type { Campaign } from '@/types';
import type { CampaignFormState } from './formState';

export type Step7Props = {
  value: CampaignFormState;
  businessName?: string;
  submitting?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  /** Label for the primary action (defaults to "Publish campaign"). */
  primaryLabel?: string;
  /** Show the secondary "Save as draft" button (create flow only). */
  showSaveDraft?: boolean;
};

/** Build a throwaway Campaign-shaped object just to render the preview card. */
function toPreview(f: CampaignFormState): Campaign {
  return {
    _id: 'preview',
    businessId: 'preview',
    title: f.title || 'Untitled campaign',
    description: f.description,
    category: f.category ?? 'Other',
    location: f.isRemote ? undefined : f.location,
    isRemote: f.isRemote,
    reward: { type: f.reward.type ?? 'Product', description: f.reward.description, estimatedValue: f.reward.estimatedValue },
    deliverables: f.deliverables,
    deadline: f.deadline ?? new Date().toISOString(),
    minFollowers: f.minFollowers,
    status: 'Draft',
    tags: f.tags,
    coverImage: f.coverImage,
    applicationsCount: 0,
    isFeatured: false,
    isSpam: false,
    createdAt: new Date().toISOString(),
  };
}

export function Step7({
  value,
  businessName,
  submitting,
  onSaveDraft,
  onPublish,
  primaryLabel = 'Publish campaign',
  showSaveDraft = true,
}: Step7Props) {
  const { colors } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 10 }}>Preview</Text>
      <CampaignCard campaign={toPreview(value)} businessName={businessName} />

      <Card style={{ marginTop: 16 }}>
        <SummaryRow label="Title" value={value.title || '—'} colors={colors} />
        <SummaryRow label="Category" value={value.category ?? '—'} colors={colors} />
        <SummaryRow
          label="Location"
          value={value.isRemote ? 'Remote / Online' : value.location.city || '—'}
          colors={colors}
        />
        <SummaryRow label="Reward" value={value.reward.type ? formatReward({ type: value.reward.type, description: value.reward.description, estimatedValue: value.reward.estimatedValue }) : '—'} colors={colors} />
        <SummaryRow
          label="Deliverables"
          value={value.deliverables.map((d) => `${d.quantity}× ${d.contentType} (${d.platform})`).join(', ') || '—'}
          colors={colors}
        />
        <SummaryRow label="Deadline" value={value.deadline ? formatDate(value.deadline) : '—'} colors={colors} />
        <SummaryRow
          label="Min followers"
          value={value.minFollowers > 0 ? value.minFollowers.toLocaleString('en-CA') : 'Open to all'}
          colors={colors}
          last={value.tags.length === 0}
        />
        {value.tags.length > 0 && (
          <View style={{ paddingTop: 12 }}>
            <Text style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8 }}>Tags</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {value.tags.map((t) => (
                <TagChip key={t} label={`#${t}`} small />
              ))}
            </View>
          </View>
        )}
      </Card>

      <View style={{ marginTop: 20, gap: 12 }}>
        <Button block variant="solid" loading={submitting} onPress={onPublish}>
          {primaryLabel}
        </Button>
        {showSaveDraft && (
          <Button block variant="outline" disabled={submitting} onPress={onSaveDraft}>
            Save as draft
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value, colors, last }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors']; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.hair,
      }}
    >
      <Text style={{ fontSize: 13.5, color: colors.text3 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '500', color: colors.text }}>{value}</Text>
    </View>
  );
}
