/**
 * Phone verification — confirm a mobile number over SMS.
 *
 * Two steps in one screen: enter a number (India +91), then the 6-digit code we
 * text. Success stores the verified number and flips `user.isPhoneVerified`.
 *
 * Like email, in dev the backend returns the code in the send response
 * (EXPOSE_DEV_OTP) so the flow is testable before Twilio credentials exist — shown
 * here only under `__DEV__`.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Button, Icon } from '@/components/ui';
import {
  OtpInput,
  ResendRow,
  TrustLine,
  VerifyHeading,
  VerifyShell,
  VerifySuccess,
} from '@/components/verify';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { PublicUser } from '@/types';

const RESEND_COOLDOWN = 30;
const DIAL_CODE = '+91'; // India-first; the backend accepts any E.164 number.

export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [phase, setPhase] = useState<'phone' | 'otp' | 'success'>('phone');
  const [digits, setDigits] = useState(''); // national number, no country code
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const e164 = `${DIAL_CODE}${digits}`;
  const phoneValid = digits.length === 10;

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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: error ? colors.danger : colors.hair,
            borderRadius: 14,
            backgroundColor: colors.card,
            paddingHorizontal: 14,
            height: 56,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{DIAL_CODE}</Text>
          <View style={{ width: 1, height: 24, backgroundColor: colors.hair, marginHorizontal: 12 }} />
          <TextInput
            value={digits}
            onChangeText={(t) => {
              setDigits(t.replace(/\D/g, '').slice(0, 10));
              if (error) setError(null);
            }}
            placeholder="98765 43210"
            placeholderTextColor={colors.text3}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={10}
            autoFocus
            style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}
          />
        </View>

        <View style={{ minHeight: 22, marginTop: 12, justifyContent: 'center' }}>
          {error ? (
            <Text style={{ fontSize: 13.5, color: colors.danger }}>{error}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 8 }}>
          <Button block size="lg" loading={busy} disabled={!phoneValid} onPress={send}>
            Send code
          </Button>
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

      {devCode ? (
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
          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text2 }}>
            dev code: {devCode}
          </Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
    </VerifyShell>
  );
}
