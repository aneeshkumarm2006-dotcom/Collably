/**
 * Login screen (PRD §7.1). Email + password sign-in, a "Continue with Google"
 * button (when configured), and a forgot-password link.
 *
 * On success we hand the backend's auth payload to `authStore.signIn()` and do
 * NOT navigate manually — the root auth gate (`app/_layout.tsx`) reacts to the new
 * session and routes the user to their role home (or onboarding if incomplete).
 */
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import {
  AuthShell,
  AuthInput,
  GoogleButton,
  FormBanner,
  OrDivider,
} from '@/components/auth';
import { Button } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useGoogleSignIn } from '@/lib/googleAuth';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import { validateEmail } from '@/lib/validation';

export default function LoginScreen() {
  const { colors } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const google = useGoogleSignIn({ onError: setFormError });

  const submit = async () => {
    setFormError(null);
    const emailErr = validateEmail(email);
    const passwordErr = password ? undefined : 'Password is required';
    if (emailErr || passwordErr) {
      setErrors({ email: emailErr ?? undefined, password: passwordErr });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.post<AuthPayload>('/auth/login', {
        email: email.trim(),
        password,
      });
      await signIn(data);
      // Routing handled by the auth gate.
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || google.signingIn;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your collabs."
      onBack={() => router.back()}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-sm" style={{ color: colors.text2 }}>
            New to Collably?{' '}
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.accent }}
            onPress={() => router.replace('/(auth)/signup')}
          >
            Create an account
          </Text>
        </View>
      }
    >
      {formError && <FormBanner message={formError} />}

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        icon="inbox"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
        editable={!busy}
      />

      <AuthInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        icon="lock"
        placeholder="Your password"
        secure
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
        editable={!busy}
      />

      <Text
        className="mb-5 self-end text-sm font-semibold"
        style={{ color: colors.accent }}
        onPress={() => router.push('/(auth)/forgot-password')}
      >
        Forgot password?
      </Text>

      <Button block loading={submitting} disabled={busy} onPress={submit}>
        Log in
      </Button>

      {google.available && (
        <>
          <OrDivider />
          <GoogleButton onPress={google.start} loading={google.signingIn} disabled={submitting} />
        </>
      )}
    </AuthShell>
  );
}
