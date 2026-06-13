# Collably — Mobile App (Expo)

The Collably mobile client: an Expo (React Native) app built with **Expo Router**,
**NativeWind v4**, **Zustand**, and **Axios**, talking to the standalone Express API
in [`../backend`](../backend). Shared domain types/constants come from
[`../shared`](../shared) so the app and API never drift.

> Status: **Phase 7 — Foundation complete.** Scaffold, design system, API client,
> auth store, and a connectivity boot screen are in place. Screens and components
> land in Phases 8–14 (see [`../../_ai_context/TODO.md`](../../_ai_context/TODO.md)).

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 56 · React Native 0.85 · React 19 (New Architecture) |
| Routing | Expo Router (file-based, typed routes) |
| Styling | NativeWind v4 + Tailwind v3, tokens ported from the design reference |
| State | Zustand (`authStore`, `notificationStore`) |
| HTTP | Axios with JWT interceptor + refresh-on-401 |
| Secure storage | `expo-secure-store` (JWT access/refresh pair) |
| Images | `expo-image`, `expo-image-picker`, `expo-image-manipulator`, Cloudinary upload |
| Push | `expo-notifications` (registered on login in Phase 15) |

## Project layout (PRD §16)

```
app/            file-based routes (Expo Router). Root _layout wires providers.
components/     UI + shared components (ThemeProvider here; library in Phase 8)
lib/            api, auth (SecureStore), cloudinary, notifications, utils, env
store/          Zustand stores (auth, notifications)
constants/      design tokens (theme.ts) + thin re-exports of ../shared/constants
types/          thin re-exports of ../shared/types
assets/         icons, splash, fonts (placeholders until Phase 18)
```

Cross-package imports: `constants/` and `types/` re-export from `../shared`, which
Metro resolves via `watchFolders` in [`metro.config.js`](metro.config.js). App code
should import from `@/constants` and `@/types`, never reach into `../shared` directly.

## Setup

```bash
# from app/mobile
npm install
cp .env.example .env        # optional — dev auto-detects your LAN IP
```

Make sure the backend is running (`cd ../backend && npm run dev`, default port 4000).

### Environment

Only `EXPO_PUBLIC_*` vars reach the bundle. The single var is the API base URL
(`EXPO_PUBLIC_API_URL`, including the `/api` suffix). In dev it's **optional** — the
app derives your laptop's LAN IP from the Metro host so Expo Go on a physical phone
can reach `http://<lan-ip>:4000/api`. Set it explicitly if that doesn't fit your
network. Preview/production builds get it per-profile from [`eas.json`](eas.json).

## Run

```bash
npm start            # Expo dev server (scan the QR with Expo Go)
npm run android      # open on Android emulator/device
npm run ios          # open on iOS simulator (macOS)
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

The boot screen (`app/index.tsx`) pings `GET /api/health` and shows the result — a
quick way to confirm the device can reach the backend. It's replaced by the real
welcome/auth gate in Phases 9–10.

## Design tokens

`constants/theme.ts` is the single source of truth for the palette (light/dark),
radii, spacing, and type scale, ported from
`_ai_context/Food Collaboration App/app/tokens.jsx`. It feeds **both**:

- runtime dynamic styles via `useTheme()` ([`components/ThemeProvider.tsx`](components/ThemeProvider.tsx)), and
- static Tailwind utilities via [`tailwind.config.ts`](tailwind.config.ts) (e.g. `bg-card`, `text-money`).

Brand accent is Blinkit green `#0C831F`; green doubles as the money/rewards color.
