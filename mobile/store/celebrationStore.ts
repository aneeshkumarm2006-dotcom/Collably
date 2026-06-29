/**
 * Celebration store (Zustand). Drives the app-wide "Hurray" popup — a confetti
 * modal fired on big positive moments (currently: an admin verifying a creator
 * or business, surfaced via the `notification:new` socket event or a tapped
 * verification push). Kept deliberately tiny: one optional payload + show/hide.
 */
import { create } from 'zustand';

export type Celebration = {
  /** Big headline, e.g. "You're verified! 🎉". */
  title: string;
  /** Supporting line under the headline. */
  message: string;
};

type CelebrationState = {
  current: Celebration | null;
  /** Show the celebration popup (replaces any current one). */
  celebrate: (c: Celebration) => void;
  /** Dismiss the popup. */
  dismiss: () => void;
};

export const useCelebrationStore = create<CelebrationState>((set) => ({
  current: null,
  celebrate: (current) => set({ current }),
  dismiss: () => set({ current: null }),
}));
