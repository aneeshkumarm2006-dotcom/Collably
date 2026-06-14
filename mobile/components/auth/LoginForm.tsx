/**
 * Login form body (PRD §7.1) — the fields + CTA that sit inside the shared
 * `PremiumAuthLayout` chrome (which owns the Sign up / Sign in toggle). Owns the
 * form state, the email/password login call, and Google sign-in.
 *
 * On success we hand the backend's auth payload to `authStore.signIn()` and do NOT
 * navigate manually — the root auth gate (`app/_layout.tsx`) reacts to the new
 * session and routes the user to their role home (or onboarding if incomplete).
 */
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { AuthInput } from './AuthInput';
import { GoogleButton } from './GoogleButton';
import { FormBanner } from './FormBanner';
import { AuthFooter } from './AuthFooter';
import { Button } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useGoogleSignIn } from '@/lib/googleAuth';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import { validateEmail } from '@/lib/validation';

export function LoginForm() {
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
    <>
      {formError && <FormBanner message={formError} />}

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        icon="message"
        placeholder="you@email.com"
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
        placeholder="Enter your password"
        secure
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
        editable={!busy}
      />

      <View style={{ alignItems: 'flex-end', marginTop: -6, marginBottom: 18 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.brandGreenText }} onPress={() => router.push('/(auth)/forgot-password')}>
          Forgot password?
        </Text>
      </View>

      <Button block size="lg" loading={submitting} disabled={busy} onPress={submit} iconRight="arrowR">
        Sign in
      </Button>

      <AuthFooter
        social={google.available ? <GoogleButton onPress={google.start} loading={google.signingIn} disabled={submitting} /> : undefined}
      />
    </>
  );
}
