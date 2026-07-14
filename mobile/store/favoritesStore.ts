/**
 * Saved collabs ("favourites") store (Zustand). Backs the heart on every collab
 * card: holds the set of saved campaign ids so any card can render its own state
 * without refetching, and toggles against `/api/favorites`.
 *
 * The toggle is optimistic — the heart flips instantly and rolls back if the
 * request fails, so a tap never feels laggy on a slow connection.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

/**
 * Per-campaign request chain. A fast double-tap fires two toggles; without this the
 * POST and DELETE race and can land at the backend out of order, leaving the server
 * "saved" while the heart shows unsaved. Chaining each campaign's requests keeps
 * them ordered, so the last tap always wins.
 */
const inflight = new Map<string, Promise<unknown>>();

/** Queue `run` behind any pending request for this campaign. */
function serialize(campaignId: string, run: () => Promise<unknown>): Promise<unknown> {
  const prev = inflight.get(campaignId) ?? Promise.resolve();
  // Swallow the previous failure here so one failed toggle doesn't reject the next.
  const next = prev.catch(() => {}).then(run);
  inflight.set(campaignId, next);
  // Only clear the slot if we're still the newest request for this campaign.
  const done = () => {
    if (inflight.get(campaignId) === next) inflight.delete(campaignId);
  };
  next.then(done, done);
  return next;
}

type FavoritesState = {
  /** Campaign ids the signed-in creator has saved. */
  ids: Set<string>;
  /** True once `refresh()` has completed at least once this session. */
  loaded: boolean;
  isSaved: (campaignId: string) => boolean;
  /** Load the saved ids from the backend. Best-effort; safe to call repeatedly. */
  refresh: () => Promise<void>;
  /** Flip the heart. Resolves to the new saved state. */
  toggle: (campaignId: string) => Promise<boolean>;
  /** Drop all state (on sign-out — the next creator must not inherit these). */
  clear: () => void;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  loaded: false,

  isSaved: (campaignId) => get().ids.has(campaignId),

  refresh: async () => {
    try {
      const { data } = await api.get<{ ids: string[] }>('/favorites/ids');
      set({ ids: new Set(data.ids ?? []), loaded: true });
    } catch {
      // Non-fatal: a creator with no profile (or an offline open) just sees empty
      // hearts rather than a blocked home screen.
      set({ loaded: true });
    }
  },

  toggle: async (campaignId) => {
    const wasSaved = get().ids.has(campaignId);
    const next = !wasSaved;

    // Optimistic flip.
    set((s) => {
      const ids = new Set(s.ids);
      if (next) ids.add(campaignId);
      else ids.delete(campaignId);
      return { ids };
    });

    try {
      await serialize(campaignId, () =>
        next ? api.post(`/favorites/${campaignId}`) : api.delete(`/favorites/${campaignId}`),
      );
      return next;
    } catch (err) {
      // Roll back to the pre-tap state so the heart never lies about what's saved.
      set((s) => {
        const ids = new Set(s.ids);
        if (wasSaved) ids.add(campaignId);
        else ids.delete(campaignId);
        return { ids };
      });
      throw err;
    }
  },

  clear: () => {
    inflight.clear();
    set({ ids: new Set<string>(), loaded: false });
  },
}));
