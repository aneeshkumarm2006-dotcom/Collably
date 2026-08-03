/**
 * Notification banner store (Zustand). Drives the lightweight top toast that
 * slides in for incoming live notifications (chat messages, application updates,
 * etc.) — the non-celebration counterpart to {@link useCelebrationStore}. The
 * celebration types (verification approved) still get the confetti modal, not
 * this banner, so the two never fire for the same event.
 *
 * Kept deliberately tiny: one optional payload + show/dismiss. `show()` dedupes
 * against the currently-visible notification id so a duplicate socket delivery
 * can't re-trigger the slide-in.
 */
import { create } from 'zustand';

export type NotificationBanner = {
  /** The source notification's `_id` — used to dedupe repeat deliveries. */
  id: string;
  /** The line shown in the banner (already user-facing copy from the server). */
  message: string;
  /** Role-neutral deep link (e.g. `/chat/:id`) resolved on tap. */
  deepLinkPath?: string;
  /** Notification type — picks the leading icon (message vs bell). */
  type?: string;
};

type NotificationBannerState = {
  current: NotificationBanner | null;
  /** Show a banner. Ignored if its id matches the one already showing. */
  show: (banner: NotificationBanner) => void;
  /** Hide the banner. */
  dismiss: () => void;
};

export const useNotificationBannerStore = create<NotificationBannerState>((set, get) => ({
  current: null,
  show: (banner) => {
    if (get().current?.id === banner.id) return; // dedupe repeat deliveries
    set({ current: banner });
  },
  dismiss: () => set({ current: null }),
}));
