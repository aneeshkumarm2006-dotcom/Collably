/**
 * Signup form body (PRD §7.1) — the fields + CTA that sit inside the shared
 * `PremiumAuthLayout` chrome. The layout owns the Sign up / Sign in toggle and the
 * role (so toggling between the two never loses the role); this component owns the
 * form state, validation, the email/password register call, and Google sign-in.
 *
 * When no role is set yet (arrived at signup without picking one on welcome) it
 * shows an inline role picker and reports the choice up via `onPickRole`.
 */
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { AuthInput } from './AuthInput';
import { GoogleButton } from './GoogleButton';
import { FormBanner } from './FormBanner';
import { AuthFooter } from './AuthFooter';
import { Button, Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useGoogleSignIn } from '@/lib/googleAuth';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import { validateEmail, validateName, validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';

export type SignupRole = 'business' | 'creator';

const ROLE_CARDS: { role: SignupRole; icon: IconName; title: string; body: string }[] = [
  { role: 'creator', icon: 'sparkles', title: 'Creator', body: 'Apply to collabs, grow your portfolio.' },
  { role: 'business', icon: 'briefcase', title: 'Business', body: 'Post gifting campaigns, find creators.' },
];

export type SignupFormProps = {
  role: SignupRole | null;
  onPickRole: (role: SignupRole) => void;
};

export function SignupForm({ role, onPickRole }: SignupFormProps) {
  const { colors } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
      setErrors({ name: nameErr ?? undefined, email: emailErr ?? undefined, password: passwordErr ?? undefined });
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
    <>
      {formError && <FormBanner message={formError} />}

      {/* Inline role picker when no role was pre-selected from welcome. */}
      {!role && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 9 }}>I'm joining as a…</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {ROLE_CARDS.map((card) => (
              <Pressable
                key={card.role}
                onPress={() => onPickRole(card.role)}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: colors.hairStrong,
                  backgroundColor: colors.cardSunk,
                  padding: 14,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandGreenSoft }}>
                  <Icon name={card.icon} size={20} color={colors.brandGreenText} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 10 }}>{card.title}</Text>
                <Text style={{ fontSize: 12, color: colors.text2, marginTop: 2, lineHeight: 16 }}>{card.body}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <AuthInput
        label={role === 'business' ? 'Business name' : role === 'creator' ? 'Display name' : 'Name'}
        value={name}
        onChangeText={setName}
        icon={role === 'business' ? 'store' : 'person'}
        placeholder={role === 'business' ? 'e.g. Maple & Co.' : 'e.g. Priya Sharma'}
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
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
        editable={!busy}
      />

      <Button block size="lg" loading={submitting} disabled={busy} onPress={submit} iconRight="arrowR">
        Create account
      </Button>

      <AuthFooter
        showTerms
        social={google.available ? <GoogleButton onPress={onGoogle} loading={google.signingIn} disabled={submitting} /> : undefined}
      />
    </>
  );
}
