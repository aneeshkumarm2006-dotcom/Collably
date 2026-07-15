/**
 * Tracks which one-per-launch intro animations have already played.
 *
 * This exists because the home screen reloads on **every tab focus** — keying the
 * header intro to mount or to `loading` would replay the whole reveal every time
 * the user taps Home, which turns a flourish into a tic. The flag is deliberately
 * in-memory (not persisted): "once per app launch" is the intended cadence, so a
 * cold start should show it again.
 */
import { create } from 'zustand';

type IntroState = {
  /** The blue header's greeting + stat reveal has run this launch. */
  homeIntroPlayed: boolean;
  markHomeIntroPlayed: () => void;
  /**
   * The "verify your email" nudge has been shown this launch. Keeps the auto-prompt
   * to once per launch so a new signup is asked once, and an existing unverified
   * user gets a gentle reminder — never a per-tab-focus loop.
   */
  emailPromptShown: boolean;
  markEmailPromptShown: () => void;
  /** Sign-out resets these, so the next user starts fresh. */
  reset: () => void;
};

export const useIntroStore = create<IntroState>((set) => ({
  homeIntroPlayed: false,
  markHomeIntroPlayed: () => set({ homeIntroPlayed: true }),
  emailPromptShown: false,
  markEmailPromptShown: () => set({ emailPromptShown: true }),
  reset: () => set({ homeIntroPlayed: false, emailPromptShown: false }),
}));
