/**
 * Shared footer for the auth forms (PRD §7.1): an optional "or continue with"
 * divider + social button, the security reassurance line, and (signup only) the
 * Terms & Privacy line. Lives outside the layout so the Sign up / Sign in forms
 * can each own a mode-specific footer while staying visually identical.
 */
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Icon } from '@/components/ui';

export type AuthFooterProps = {
  /** Optional social-auth node (e.g. the Google button), shown under a divider. */
  social?: ReactNode;
  /** Show the Terms & Privacy line (signup only). */
  showTerms?: boolean;
};

export function AuthFooter({ social, showTerms }: AuthFooterProps) {
  const { colors } = useTheme();
  return (
    <>
      {social ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
            <Text style={{ fontSize: 12.5, color: colors.text3, fontWeight: '600' }}>or continue with</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
          </View>
          {social}
        </>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 22 }}>
        <Icon name="lock" size={13} color={colors.text3} />
        <Text style={{ fontSize: 12.5, color: colors.text3 }}>Secured · we never post without your say-so</Text>
      </View>

      {showTerms ? (
        <Text style={{ textAlign: 'center', fontSize: 11.5, color: colors.text3, lineHeight: 17, marginTop: 8, marginHorizontal: 12 }}>
          By creating an account you agree to our{' '}
          <Text style={{ color: colors.text2, fontWeight: '600' }}>Terms</Text> &{' '}
          <Text style={{ color: colors.text2, fontWeight: '600' }}>Privacy Policy</Text>.
        </Text>
      ) : null}
    </>
  );
}
