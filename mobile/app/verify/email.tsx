/**
 * Email verification — confirm the address the account signed up with.
 *
 * On open we send a 6-digit code to the user's email (Resend on the backend); the
 * user types it into the segmented input, which auto-submits on the last digit.
 * Success flips `user.isVerified` and shows the shared celebration.
 *
 * In dev, the backend hands the code back in the send response (EXPOSE_DEV_OTP) so
 * the flow is testable before a Resend domain is verified — surfaced here only
 * under `__DEV__`, never in a release build.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const RESEND_COOLDOWN = 30; // seconds — matches the backend OTP cooldown

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  // `flow=prompt` marks the post-signup nudge — it gets a "Skip for now" out.
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const isPrompt = flow === 'prompt';
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [phase, setPhase] = useState<'sending' | 'entry' | 'success'>('sending');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Countdown for the resend timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const send = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.post<{ sent?: boolean; alreadyVerified?: boolean; devCode?: string }>(
        '/auth/verify/email/send',
      );
      if (data.alreadyVerified) {
        // Nothing to do — reflect it and bounce back.
        if (user) setUser({ ...user, isVerified: true });
        goBack();
        return;
      }
      setCooldown(RESEND_COOLDOWN);
      if (__DEV__ && data.devCode) setDevCode(data.devCode);
      setPhase('entry');
    } catch (err) {
      // A cooldown 429 on a resend is expected; just surface it and stay on entry.
      setError(isApiError(err) ? err.message : "Couldn't send a code. Try again.");
      setPhase('entry');
    }
  }, [user, setUser, goBack]);

  // Send once on open.
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
        setUser(data.user);
        setPhase('success');
      } catch (err) {
        setError(isApiError(err) ? err.message : "That code didn't work. Try again.");
        setCode('');
      } finally {
        setVerifying(false);
      }
    },
    [setUser],
  );

  if (phase === 'success') {
    return (
      <VerifySuccess
        title="Email verified"
        detail={
          <Text style={{ fontSize: 15, color: colors.text2, textAlign: 'center' }}>{user?.email}</Text>
        }
        onDone={goBack}
      />
    );
  }

  return (
    <VerifyShell
      onBack={goBack}
      footer={
        isPrompt ? (
          <Pressable onPress={goBack} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text2, textAlign: 'center' }}>
              I’ll do this later
            </Text>
          </Pressable>
        ) : (
          <TrustLine icon="clock">Codes expire in 10 minutes</TrustLine>
        )
      }
    >
      <VerifyHeading
        icon="inbox"
        title="Check your inbox"
        subtitle={
          phase === 'sending' ? (
            'Sending a code to your email…'
          ) : (
            <>
              Enter the 6-digit code we sent to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>{user?.email}</Text>.
            </>
          )
        }
      />

      {phase === 'sending' ? (
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

          {devCode ? (
            <View
              style={{
                marginTop: 24,
                alignSelf: 'center',
                backgroundColor: colors.cardSunk,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text2 }}>
                dev code: {devCode}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <View style={{ flex: 1 }} />
    </VerifyShell>
  );
}
