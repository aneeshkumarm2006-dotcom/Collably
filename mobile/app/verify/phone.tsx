/**
 * Phone verification — confirm a mobile number over SMS.
 *
 * Two steps in one screen: enter a number (country picker, defaults to Canada),
 * then the 6-digit code we text. Success stores the verified number and flips
 * `user.isPhoneVerified`.
 *
 * Like email, in dev the backend returns the code in the send response
 * (EXPOSE_DEV_OTP) so the flow is testable before Twilio credentials exist — shown
 * here only under `__DEV__`.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DevCodePill,
  OtpInput,
  PhoneNumberField,
  ResendRow,
  TrustLine,
  VerifyButton,
  VerifyHeading,
  VerifyShell,
  VerifySuccess,
} from '@/components/verify';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_COUNTRY, toE164, type PhoneCountry } from '@/lib/phoneCountries';
import type { PublicUser } from '@/types';

const RESEND_COOLDOWN = 30;

export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [phase, setPhase] = useState<'phone' | 'otp' | 'success'>('phone');
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_COUNTRY);
  const [digits, setDigits] = useState(''); // national number, no country code
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const e164 = toE164(country, digits);
  const phoneValid = country.valid(digits);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

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
      const { data } = await api.post<{ sent?: boolean; alreadyVerified?: boolean; devCode?: string }>(
        '/auth/verify/phone/send',
        { phone: e164 },
      );
      if (data.alreadyVerified) {
        goBack();
        return;
      }
      setCooldown(RESEND_COOLDOWN);
      if (__DEV__ && data.devCode) setDevCode(data.devCode);
      setCode('');
      setPhase('otp');
    } catch (err) {
      setError(isApiError(err) ? err.message : "Couldn't send a code. Try again.");
    } finally {
      setBusy(false);
    }
  }, [e164, phoneValid, goBack]);

  const confirm = useCallback(
    async (submitted: string) => {
      setBusy(true);
      setError(null);
      try {
        const { data } = await api.post<{ user: PublicUser }>('/auth/verify/phone/confirm', {
          phone: e164,
          code: submitted,
        });
        setUser(data.user);
        setPhase('success');
      } catch (err) {
        setError(isApiError(err) ? err.message : "That code didn't work. Try again.");
        setCode('');
      } finally {
        setBusy(false);
      }
    },
    [e164, setUser],
  );

  if (phase === 'success') {
    return (
      <VerifySuccess
        title="Phone verified"
        detail={<Text style={{ fontSize: 15, color: colors.text2 }}>{e164}</Text>}
        onDone={goBack}
      />
    );
  }

  // ── Step 1: enter the number ──
  if (phase === 'phone') {
    return (
      <VerifyShell
        onBack={goBack}
        step={0}
        steps={2}
        footer={<TrustLine icon="lock">We only use this to verify it's really you</TrustLine>}
      >
        <VerifyHeading
          icon="phone"
          title="Add your mobile number"
          subtitle="We'll text you a 6-digit code to confirm it."
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
          {error ? (
            <Text style={{ fontSize: 13.5, color: colors.danger }}>{error}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 8 }}>
          <VerifyButton label="Send code" loading={busy} disabled={!phoneValid} onPress={send} />
        </View>

        <View style={{ flex: 1 }} />
      </VerifyShell>
    );
  }

  // ── Step 2: enter the code ──
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

      <DevCodePill code={devCode} />

      <View style={{ flex: 1 }} />
    </VerifyShell>
  );
}
