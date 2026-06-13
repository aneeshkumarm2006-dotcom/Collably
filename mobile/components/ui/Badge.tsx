/**
 * Status pill with a leading dot, ported from the design reference's `Badge`.
 *
 * Use it two ways:
 *   <Badge tone="success" label="Active" />              — explicit tone + label
 *   <Badge status="Accepted" />                          — auto tone/label from a
 *                                                          campaign/application status
 *
 * The `status` form maps every Campaign/Application status (PRD §12, §11) to a
 * tone + display label, so cards across the app stay consistent.
 */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import type { ApplicationStatus, CampaignStatus } from '@/constants';

export type BadgeTone = 'success' | 'warn' | 'accent' | 'muted' | 'money' | 'danger';

/** Domain status → [tone, label]. Covers both campaign and application statuses. */
const STATUS_MAP: Record<CampaignStatus | ApplicationStatus, [BadgeTone, string]> = {
  // Campaign
  Draft: ['muted', 'Draft'],
  Active: ['success', 'Active'],
  Paused: ['warn', 'Paused'],
  Closed: ['muted', 'Closed'],
  // Application
  Pending: ['warn', 'Pending'],
  Accepted: ['accent', 'Accepted'],
  Rejected: ['muted', 'Not selected'],
  Withdrawn: ['muted', 'Withdrawn'],
  Cancelled: ['danger', 'Cancelled'],
  Overdue: ['danger', 'Overdue'],
  // Shared by both unions
  Completed: ['success', 'Completed'],
};

export type BadgeProps =
  | { status: CampaignStatus | ApplicationStatus; tone?: never; label?: string }
  | { status?: never; tone: BadgeTone; label: string };

export function Badge(props: BadgeProps) {
  const { colors } = useTheme();

  const [tone, defaultLabel]: [BadgeTone, string] =
    'status' in props && props.status ? STATUS_MAP[props.status] : [props.tone ?? 'muted', ''];
  const label = props.label ?? defaultLabel;

  const tones: Record<BadgeTone, [string, string]> = {
    success: [colors.successSoft, colors.success],
    warn: [colors.warnSoft, colors.warn],
    accent: [colors.accentSoft, colors.accent],
    muted: [colors.cardSunk, colors.text2],
    money: [colors.moneySoft, colors.money],
    danger: [`${colors.danger}1F`, colors.danger],
  };
  const [bg, fg] = tones[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingVertical: 3,
        paddingLeft: 7,
        paddingRight: 9,
        borderRadius: 20,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 }}>{label}</Text>
    </View>
  );
}
