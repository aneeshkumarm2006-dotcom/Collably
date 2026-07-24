/**
 * Instagram verification — prove account ownership via the DM-code flow.
 *
 * Steps: enter your handle → DM "hi" to our account (we poll until it lands and the
 * sender matches your handle) → enter the code we DM back → verified, with Meta's
 * real follower count. Verifying is a trust signal, never a gate.
 *
 * Until Meta App Review clears, the backend can't receive a real DM, so in dev a
 * "Simulate DM" button stands in for it (gated to __DEV__).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
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
import { Press } from '@/components/home';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { formatCompactNumber } from '@/lib/utils';

type Phase = 'handle' | 'awaiting_dm' | 'code' | 'success';
type StatusResp = { status: string; handle?: string; followerCount?: number | null };

const POLL_MS = 2500;

export default function VerifyInstagramScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('handle');
  const [handleInput, setHandleInput] = useState('');
  const [bizHandle, setBizHandle] = useState('localcreatorcrew');
  const [code, setCode] = useState('');
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ── Start: claim the handle ──
  const start = useCallback(async () => {
    if (!handleInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ handle: string; businessHandle: string }>(
        '/verify/instagram/start',
        { handle: handleInput.trim() },
      );
      setBizHandle(data.businessHandle);
      setPhase('awaiting_dm');
    } catch (err) {
      setError(isApiError(err) ? err.message : "Couldn't start verification. Try again.");
    } finally {
      setBusy(false);
    }
  }, [handleInput]);

  // ── Poll status while waiting for the DM ──
  const advanceToCode = useCallback((count: number | null) => {
    setFollowerCount(count);
    setCode('');
    setCooldown(30);
    setPhase('code');
  }, []);

  useEffect(() => {
    if (phase !== 'awaiting_dm') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await api.get<StatusResp>('/verify/instagram/status');
        if (cancelled) return;
        if (data.status === 'code_sent') advanceToCode(data.followerCount ?? null);
      } catch {
        // Transient — keep polling.
      }
    };
    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, advanceToCode]);

  const openInstagram = useCallback(() => {
    // ig.me opens a DM thread with the account; fall back to the profile.
    Linking.openURL(`https://ig.me/m/${bizHandle}`).catch(() =>
      Linking.openURL(`https://instagram.com/${bizHandle}`).catch(() => {}),
    );
  }, [bizHandle]);

  const simulateDm = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ devCode?: string; followerCount?: number }>(
        '/verify/instagram/dev/simulate',
        {},
      );
      if (data.devCode) setDevCode(data.devCode);
      advanceToCode(data.followerCount ?? null);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Simulate failed.');
    } finally {
      setBusy(false);
    }
  }, [advanceToCode]);

  const confirm = useCallback(async (submitted: string) => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ followerCount?: number | null }>(
        '/verify/instagram/confirm',
        { code: submitted },
      );
      setFollowerCount(data.followerCount ?? null);
      setPhase('success');
    } catch (err) {
      setError(isApiError(err) ? err.message : "That code didn't work. Try again.");
      setCode('');
    } finally {
      setBusy(false);
    }
  }, []);

  // ── Success ──
  if (phase === 'success') {
    return (
      <VerifySuccess
        title="Instagram verified"
        detail={
          followerCount != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="instagram" size={16} color={colors.text2} />
              <Text style={{ fontSize: 15, color: colors.text2 }}>
                {formatCompactNumber(followerCount)} followers
              </Text>
            </View>
          ) : undefined
        }
        onDone={goBack}
      />
    );
  }

  // ── Step 1: handle ──
  if (phase === 'handle') {
    return (
      <VerifyShell
        onBack={goBack}
        step={0}
        steps={3}
        footer={<TrustLine icon="lock">We never ask for your Instagram password</TrustLine>}
      >
        <VerifyHeading
          icon="instagram"
          title="Verify your Instagram"
          subtitle="Enter your handle or profile link — we'll confirm it's yours with a quick DM."
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1.5,
            borderColor: error ? colors.danger : colors.hair,
            borderRadius: 14,
            backgroundColor: colors.card,
            paddingHorizontal: 14,
            height: 56,
          }}
        >
          <Icon name="instagram" size={20} color={colors.text3} />
          <TextInput
            value={handleInput}
            onChangeText={(t) => {
              setHandleInput(t);
              if (error) setError(null);
            }}
            placeholder="@yourhandle or profile link"
            placeholderTextColor={colors.text3}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus
            style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}
          />
        </View>

        <View style={{ minHeight: 22, marginTop: 12, justifyContent: 'center' }}>
          {error ? <Text style={{ fontSize: 13.5, color: colors.danger }}>{error}</Text> : null}
        </View>

        <Button block size="lg" loading={busy} disabled={!handleInput.trim()} onPress={start}>
          Continue
        </Button>
        <View style={{ flex: 1 }} />
      </VerifyShell>
    );
  }

  // ── Step 2: DM us ──
  if (phase === 'awaiting_dm') {
    return (
      <VerifyShell onBack={() => setPhase('handle')} step={1} steps={3}>
        <VerifyHeading
          icon="message"
          title="Say hi to confirm it's you"
          subtitle={
            <>
              Open Instagram and send <Text style={{ fontWeight: '700', color: colors.text }}>hi</Text> to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>@{bizHandle}</Text>. We'll spot it and
              text you a code right back.
            </>
          }
        />

        <Button block size="lg" icon="instagram" onPress={openInstagram}>
          Open Instagram
        </Button>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }}>
          <ActivityIndicator color={colors.text3} />
          <Text style={{ fontSize: 13.5, color: colors.text2 }}>Waiting for your message…</Text>
        </View>

        {__DEV__ ? (
          <View style={{ marginTop: 28, alignItems: 'center' }}>
            <Press
              onPress={simulateDm}
              style={{
                borderWidth: 1,
                borderColor: colors.hair,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 9,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text2 }}>
                ▶ Simulate DM (dev)
              </Text>
            </Press>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
      </VerifyShell>
    );
  }

  // ── Step 3: code ──
  return (
    <VerifyShell
      onBack={() => setPhase('awaiting_dm')}
      step={2}
      steps={3}
      footer={<TrustLine icon="clock">Codes expire in 10 minutes</TrustLine>}
    >
      <VerifyHeading
        icon="message"
        title="Enter the code"
        subtitle={<>Check your Instagram DMs from @{bizHandle} and enter the 6-digit code.</>}
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
        <ResendRow seconds={cooldown} onResend={() => setPhase('awaiting_dm')} />
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
