/**
 * Forgot-password screen (PRD §7.1). Enter an email → backend generates a reset
 * token and emails a `collably://reset-password?token=…` deep link. The response
 * is intentionally generic (no email enumeration), so we always show the same
 * confirmation on success.
 *
 * Dev affordance: in non-production the backend echoes `devResetToken`, so we
 * surface a "Continue to reset" shortcut — the reset flow is testable on-device
 * before a real Resend sender domain is verified.
 */
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthShell, AuthInput, FormBanner } from '@/components/auth';
import { Button } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { IS_DEV } from '@/lib/env';
import { validateEmail } from '@/lib/validation';

type ForgotResponse = { message: string; devResetToken?: string };

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<ForgotResponse>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSent(true);
      setDevToken(data.devResetToken ?? null);
    } catch (e) {
      setFormError(isApiError(e) ? e.message : 'Could not send the reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      onBack={() => router.back()}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-sm" style={{ color: colors.text2 }}>
            Remembered it?{' '}
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.accent }}
            onPress={() => router.replace('/(auth)/login')}
          >
            Back to login
          </Text>
        </View>
      }
    >
      {formError && <FormBanner message={formError} />}

      {sent ? (
        <>
          <FormBanner
            tone="success"
            message="If an account exists for that email, a reset link is on its way. Check your inbox."
          />
          {IS_DEV && devToken && (
            <Button
              block
              variant="tonal"
              icon="link"
              onPress={() =>
                router.push({ pathname: '/(auth)/reset-password', params: { token: devToken } })
              }
            >
              Continue to reset (dev)
            </Button>
          )}
          <View className="h-3" />
          <Button block variant="outline" onPress={() => setSent(false)}>
            Use a different email
          </Button>
        </>
      ) : (
        <>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            icon="inbox"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={emailError}
            editable={!submitting}
          />
          <Button block loading={submitting} disabled={submitting} onPress={submit}>
            Send reset link
          </Button>
        </>
      )}
    </AuthShell>
  );
}
