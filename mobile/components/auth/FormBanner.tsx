/**
 * Inline status banner for the auth forms (PRD §7.1). A tonal box used for a
 * form-level error (e.g. "Invalid email or password") or a success confirmation
 * (e.g. "Reset link sent"). Screens render it above the submit button.
 */
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon, type IconName } from '@/components/ui';

export type FormBannerProps = {
  message: string;
  tone?: 'error' | 'success' | 'info';
};

export function FormBanner({ message, tone = 'error' }: FormBannerProps) {
  const { colors } = useTheme();

  const styles: Record<NonNullable<FormBannerProps['tone']>, { bg: string; fg: string; icon: IconName }> = {
    error: { bg: `${colors.danger}1A`, fg: colors.danger, icon: 'alert' },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkcircle' },
    info: { bg: colors.accentSoft, fg: colors.accent, icon: 'info' },
  };
  const s = styles[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        backgroundColor: s.bg,
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 13,
        marginBottom: 16,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <Icon name={s.icon} size={17} color={s.fg} strokeWidth={2} />
      </View>
      <Text style={{ flex: 1, color: s.fg, fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}>
        {message}
      </Text>
    </View>
  );
}
