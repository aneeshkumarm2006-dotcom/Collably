/**
 * Mandatory verification gate — email, then phone. A new account can't reach the
 * app until both are confirmed; the root auth gate routes here whenever either is
 * unverified, and routes onward (to onboarding) the moment both are done.
 *
 * No "skip" — this is a required step, not a nudge. The only way out without
 * finishing is to log out (so nobody gets trapped). In dev the backend returns the
 * code in the send response (EXPOSE_DEV_OTP), surfaced here only under __DEV__.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Button, Icon } from '@/components/ui';
import { OtpInput, PhoneNumberField, ResendRow, TrustLine, VerifyHeading, VerifyShell } from '@/components/verify';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_COUNTRY, toE164, type PhoneCountry } from '@/lib/phoneCountries';
import type { PublicUser } from '@/types';

const RESEND_COOLDOWN = 30;

/** Dev-only code chip shown under the input. */
function DevCode({ code }: { code: string | null }) {
  const { colors } = useTheme();
  if (!code) return null;
  return (
    <View
      style={{
        marginTop: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.cardSunk,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Icon name="info" size={13} color={colors.text3} />
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text2 }}>dev code: {code}</Text>
    </View>
  );
}

export default function VerifyRequiredScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const emailDone = user?.isVerified ?? false;
  const phoneDone = user?.isPhoneVerified ?? false;

  const confirmLogout = useCallback(() => {
    Alert.alert('Log out?', 'You need to verify your email and phone to continue.', [
      { text: 'Keep verifying', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }, [signOut]);

  // Both done → the gate is about to route to onboarding; hold a spinner meanwhile.
  if (emailDone && phoneDone) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return !emailDone ? (
    <EmailStep onLogout={confirmLogout} />
  ) : (
    <PhoneStep onLogout={confirmLogout} />
  );
}

// ── Step 1: email ─────────────────────────────────────────────────────────────

function EmailStep({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const send = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.post<{ alreadyVerified?: boolean; devCode?: string }>(
        '/auth/verify/email/send',
      );
      if (data.alreadyVerified && user) {
        setUser({ ...user, isVerified: true });
        return;
      }
      setCooldown(RESEND_COOLDOWN);
      if (__DEV__ && data.devCode) setDevCode(data.devCode);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Couldn't send a code. Try again.");
    } finally {
      setSending(false);
    }
  }, [user, setUser]);

  const sentOnce = useRef(false);
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    void send();
  }, [send]);

  const confirm = useCallback(
    async (submitted: string) => {
      setVerifying(true);
      setError(null);
      try {
        const { data } = await api.post<{ user: PublicUser }>('/auth/verify/email/confirm', {
          code: submitted,
        });
        setUser(data.user); // isVerified → true; parent swaps to the phone step
      } catch (err) {
        setError(isApiError(err) ? err.message : "That code didn't work. Try again.");
        setCode('');
      } finally {
        setVerifying(false);
      }
    },
    [setUser],
  );

  return (
    <VerifyShell
      onBack={onLogout}
      step={0}
      steps={2}
      footer={<TrustLine icon="lock">Required to keep your account secure</TrustLine>}
    >
      <VerifyHeading
        icon="inbox"
        title="Verify your email"
        subtitle={
          sending ? (
            'Sending a code to your email…'
          ) : (
            <>
              Enter the 6-digit code we sent to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>{user?.email}</Text>.
            </>
          )
        }
      />

      {sending ? (
        <View style={{ paddingTop: 20, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (error) setError(null);
            }}
            onComplete={confirm}
            error={!!error}
          />
          <View style={{ minHeight: 22, marginTop: 14, justifyContent: 'center' }}>
            {error ? (
              <Text style={{ fontSize: 13.5, color: colors.danger, textAlign: 'center' }}>{error}</Text>
            ) : verifying ? (
              <ActivityIndicator color={colors.accent} />
            ) : null}
          </View>
          <View style={{ marginTop: 8 }}>
            <ResendRow seconds={cooldown} onResend={send} />
          </View>
          <DevCode code={devCode} />
        </>
      )}
      <View style={{ flex: 1 }} />
    </VerifyShell>
  );
}

// ── Step 2: phone ─────────────────────────────────────────────────────────────

function PhoneStep({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);

  const [phase, setPhase] = useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_COUNTRY);
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const e164 = toE164(country, digits);
  const phoneValid = country.valid(digits);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const send = useCallback(async () => {
    if (!phoneValid) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ devCode?: string }>('/auth/verify/phone/send', { phone: e164 });
      setCooldown(RESEND_COOLDOWN);
      if (__DEV__ && data.devCode) setDevCode(data.devCode);
      setCode('');
      setPhase('otp');
    } catch (err) {
      setError(isApiError(err) ? err.message : "Couldn't send a code. Try again.");
    } finally {
      setBusy(false);
    }
  }, [e164, phoneValid]);

  const confirm = useCallback(
    async (submitted: string) => {
      setBusy(true);
      setError(null);
      try {
        const { data } = await api.post<{ user: PublicUser }>('/auth/verify/phone/confirm', {
          phone: e164,
          code: submitted,
        });
        setUser(data.user); // isPhoneVerified → true; gate routes to onboarding
      } catch (err) {
        setError(isApiError(err) ? err.message : "That code didn't work. Try again.");
        setCode('');
      } finally {
        setBusy(false);
      }
    },
    [e164, setUser],
  );

  if (phase === 'phone') {
    return (
      <VerifyShell
        onBack={onLogout}
        step={1}
        steps={2}
        footer={<TrustLine icon="lock">We only use this to verify it's really you</TrustLine>}
      >
        <VerifyHeading
          icon="phone"
          title="Verify your phone"
          subtitle="Almost there — we'll text you a 6-digit code to confirm your number."
        />
        <PhoneNumberField
          country={country}
          onCountryChange={setCountry}
          digits={digits}
          onDigitsChange={(d) => {
            setDigits(d);
            if (error) setError(null);
          }}
          error={!!error}
          autoFocus
        />
        <View style={{ minHeight: 22, marginTop: 12, justifyContent: 'center' }}>
          {error ? <Text style={{ fontSize: 13.5, color: colors.danger }}>{error}</Text> : null}
        </View>
        <Button block size="lg" loading={busy} disabled={!phoneValid} onPress={send}>
          Send code
        </Button>
        <View style={{ flex: 1 }} />
      </VerifyShell>
    );
  }

  return (
    <VerifyShell
      onBack={() => setPhase('phone')}
      step={1}
      steps={2}
      footer={<TrustLine icon="clock">Codes expire in 10 minutes</TrustLine>}
    >
      <VerifyHeading
        icon="message"
        title="Enter the code"
        subtitle={
          <>
            Sent to <Text style={{ fontWeight: '700', color: colors.text }}>{e164}</Text>.{'  '}
            <Text onPress={() => setPhase('phone')} style={{ fontWeight: '700', color: colors.accent }}>
              Change
            </Text>
          </>
        }
      />
      <OtpInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        onComplete={confirm}
        error={!!error}
      />
      <View style={{ minHeight: 22, marginTop: 14, justifyContent: 'center' }}>
        {error ? (
          <Text style={{ fontSize: 13.5, color: colors.danger, textAlign: 'center' }}>{error}</Text>
        ) : busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : null}
      </View>
      <View style={{ marginTop: 8 }}>
        <ResendRow seconds={cooldown} onResend={send} />
      </View>
      <DevCode code={devCode} />
      <View style={{ flex: 1 }} />
    </VerifyShell>
  );
}
