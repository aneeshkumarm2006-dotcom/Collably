/**
 * Reset-password screen (PRD §7.1). Opened from the password-reset email's deep
 * link `collably://reset-password?token=…` (the `(auth)` group is transparent in
 * the URL, so the route is `/reset-password`). Enter + confirm a new password →
 * backend validates the token and returns a fresh session, so we sign the user in
 * and let the auth gate route them onward (no manual navigation).
 *
 * If the screen is opened without a token, we show a clear error and a route back
 * to "forgot password" rather than a dead form.
 */
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthShell, AuthInput, FormBanner } from '@/components/auth';
import { Button } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const signIn = useAuthStore((s) => s.signIn);
  const confirmRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);
    const passwordErr = validatePassword(password);
    const confirmErr = password !== confirm ? 'Passwords do not match' : undefined;
    if (passwordErr || confirmErr) {
      setErrors({ password: passwordErr ?? undefined, confirm: confirmErr });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.post<AuthPayload>('/auth/reset-password', { token, password });
      await signIn(data);
      // Auto-login: the auth gate takes over from here.
    } catch (e) {
      setFormError(
        isApiError(e) ? e.message : 'Could not reset your password. The link may have expired.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Opened without a token — the deep link was malformed or visited directly.
  if (!token) {
    return (
      <AuthShell title="Reset password" onBack={() => router.replace('/(auth)/login')}>
        <FormBanner message="This reset link is invalid or incomplete. Request a new one to continue." />
        <Button block icon="link" onPress={() => router.replace('/(auth)/forgot-password')}>
          Request a new link
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      onBack={() => router.replace('/(auth)/login')}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-sm" style={{ color: colors.text2 }}>
            Back to{' '}
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.accent }}
            onPress={() => router.replace('/(auth)/login')}
          >
            login
          </Text>
        </View>
      }
    >
      {formError && <FormBanner message={formError} />}

      <AuthInput
        label="New password"
        value={password}
        onChangeText={setPassword}
        icon="lock"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
        editable={!submitting}
      />

      <AuthInput
        ref={confirmRef}
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        icon="lock"
        placeholder="Re-enter your new password"
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.confirm}
        editable={!submitting}
      />

      <Button block loading={submitting} disabled={submitting} onPress={submit}>
        Reset password
      </Button>
    </AuthShell>
  );
}
