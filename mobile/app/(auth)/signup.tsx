/**
 * Signup screen (PRD §7.1). Pick a role (Business or Creator), then enter name /
 * email / password. A `?role=` query param (from the welcome CTAs) pre-selects the
 * role. Google sign-up is offered when configured — it creates the account in the
 * selected role on the backend.
 *
 * On success `authStore.signIn()` sets the session; the root auth gate routes the
 * brand-new (not-yet-onboarded) user into their role onboarding (Phase 11).
 */
import { useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AuthShell,
  AuthInput,
  GoogleButton,
  FormBanner,
  OrDivider,
} from '@/components/auth';
import { Button, Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useGoogleSignIn } from '@/lib/googleAuth';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import { validateEmail, validateName, validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';

type SignupRole = 'business' | 'creator';

const ROLE_CARDS: { role: SignupRole; icon: IconName; title: string; body: string }[] = [
  { role: 'business', icon: 'briefcase', title: 'Business', body: 'Post gifting campaigns and find creators.' },
  { role: 'creator', icon: 'sparkles', title: 'Creator', body: 'Apply to collabs and grow your portfolio.' },
];

export default function SignupScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ role?: string }>();
  const signIn = useAuthStore((s) => s.signIn);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const initialRole: SignupRole | null =
    params.role === 'business' || params.role === 'creator' ? params.role : null;

  const [role, setRole] = useState<SignupRole | null>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const google = useGoogleSignIn({ role: role ?? undefined, onError: setFormError });

  const submit = async () => {
    setFormError(null);
    if (!role) {
      setFormError('Choose how you want to join.');
      return;
    }
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (nameErr || emailErr || passwordErr) {
      setErrors({
        name: nameErr ?? undefined,
        email: emailErr ?? undefined,
        password: passwordErr ?? undefined,
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.post<AuthPayload>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      await signIn(data);
      // Auth gate routes the new account into onboarding.
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || google.signingIn;

  const onGoogle = () => {
    if (!role) {
      setFormError('Choose how you want to join first.');
      return;
    }
    google.start();
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join Collably in under a minute."
      onBack={() => router.back()}
      footer={
        <View className="flex-row items-center justify-center">
          <Text className="text-sm" style={{ color: colors.text2 }}>
            Already have an account?{' '}
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.accent }}
            onPress={() => router.replace('/(auth)/login')}
          >
            Log in
          </Text>
        </View>
      }
    >
      {formError && <FormBanner message={formError} />}

      {/* Role selection cards */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 9, letterSpacing: -0.1 }}>
        I'm joining as a…
      </Text>
      <View className="mb-5 flex-row" style={{ gap: 12 }}>
        {ROLE_CARDS.map((card) => {
          const selected = role === card.role;
          return (
            <Pressable
              key={card.role}
              onPress={() => setRole(card.role)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: selected ? colors.accent : colors.hair,
                backgroundColor: selected ? colors.accentSoft : colors.card,
                padding: 14,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: selected ? colors.accent : colors.cardSunk }}
              >
                <Icon
                  name={card.icon}
                  size={20}
                  color={selected ? colors.accentText : colors.text2}
                  strokeWidth={1.9}
                />
              </View>
              <Text className="mt-2.5 text-[15px] font-bold" style={{ color: colors.text }}>
                {card.title}
              </Text>
              <Text className="mt-1 text-[12px]" style={{ color: colors.text2, lineHeight: 16 }}>
                {card.body}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AuthInput
        label="Name"
        value={name}
        onChangeText={setName}
        icon="person"
        placeholder={role === 'business' ? 'Your name or brand' : 'Your name'}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={errors.name}
        editable={!busy}
      />

      <AuthInput
        ref={emailRef}
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
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
        editable={!busy}
      />

      <Button block loading={submitting} disabled={busy} onPress={submit}>
        Create account
      </Button>

      {google.available && (
        <>
          <OrDivider />
          <GoogleButton onPress={onGoogle} loading={google.signingIn} disabled={submitting} />
        </>
      )}
    </AuthShell>
  );
}
