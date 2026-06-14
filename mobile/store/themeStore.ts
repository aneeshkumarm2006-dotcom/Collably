/**
 * Theme-mode store (Zustand). Holds the user's appearance preference —
 * `system` (follow the OS), `light`, or `dark` — persisted across launches.
 *
 * The design exposes a Light/Dark switch; we add a third `system` option so the
 * app can still follow the OS by default. `ThemeProvider` reads `mode` and drives
 * both NativeWind's `dark:` variants and the runtime `useTheme()` palette from it.
 * Persistence uses SecureStore on native (with a localStorage fallback on web),
 * mirroring `lib/auth` — no extra dependency.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'collably.themeMode';
const isMode = (v: unknown): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark';

async function loadMode(): Promise<ThemeMode> {
  try {
    const raw =
      Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
    return isMode(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

function saveMode(mode: ThemeMode): void {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, mode);
    else void SecureStore.setItemAsync(KEY, mode);
  } catch {
    // Non-fatal — the preference just won't persist this session.
  }
}

type ThemeModeState = {
  mode: ThemeMode;
  /** Restore the saved preference on app boot. */
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeModeState>((set) => ({
  mode: 'system',
  hydrate: async () => set({ mode: await loadMode() }),
  setMode: (mode) => {
    set({ mode });
    saveMode(mode);
  },
}));
