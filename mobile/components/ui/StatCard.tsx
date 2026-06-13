/**
 * Compact metric tile for dashboards (PRD §7.3–§7.5 home/profile summaries):
 * a tinted icon chip, a big number, and a label. Ported from the design
 * reference's `StatTile`. Toneable to match the metric's meaning.
 */
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type StatCardTone = 'accent' | 'money' | 'success' | 'warn';

export type StatCardProps = {
  icon: IconName;
  value: string | number;
  label: string;
  tone?: StatCardTone;
  /** Optional trailing unit (e.g. "%", "k"). */
  suffix?: string;
  style?: ViewStyle;
};

export function StatCard({ icon, value, label, tone = 'accent', suffix, style }: StatCardProps) {
  const { colors, shadows } = useTheme();

  const tones: Record<StatCardTone, [string, string]> = {
    accent: [colors.accentSoft, colors.accent],
    money: [colors.moneySoft, colors.money],
    success: [colors.successSoft, colors.success],
    warn: [colors.warnSoft, colors.warn],
  };
  const [bg, fg] = tones[tone];

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 16,
        padding: 14,
        ...shadows.card,
        ...style,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={18} color={fg} strokeWidth={1.9} />
      </View>
      <Text style={{ fontSize: 23, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>
        {value}
        {suffix}
      </Text>
      <Text style={{ fontSize: 12, color: colors.text2, marginTop: 1, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}
