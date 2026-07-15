/**
 * One-time "verify your email" nudge, shown when a signed-in user's email isn't
 * verified yet. Fires once per app launch (guarded by the intro store) so a brand-new
 * signup is prompted right after they land — without looping on every tab focus.
 *
 * It's a nudge, not a gate: the verify screen offers "I'll do this later", matching
 * the app's no-gatekeeping stance. Both role homes call this hook.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useIntroStore } from '@/store/introStore';

/** Small delay so the home screen settles (intro animation, first data) before the push. */
const PROMPT_DELAY_MS = 900;

export function useVerifyPrompt(): void {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const isVerified = useAuthStore((s) => s.user?.isVerified ?? true);
  const shown = useIntroStore((s) => s.emailPromptShown);
  const markShown = useIntroStore((s) => s.markEmailPromptShown);

  useEffect(() => {
    // Only real signed-in users with an unverified email, once per launch.
    if (status !== 'authenticated' || isVerified || shown) return;
    markShown();
    const t = setTimeout(() => router.push('/verify/email?flow=prompt'), PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, [status, isVerified, shown, markShown, router]);
}
