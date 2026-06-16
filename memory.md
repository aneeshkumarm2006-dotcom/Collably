# CollabSpace — Fixes & Decisions Log

A running record of the problems we hit and how they were solved, so nothing gets
re-broken later. Newest at the bottom of each section. (App lives in `mobile/`.)

---

## 1. Auth: white flash + role picker reappearing on Sign up ⇄ Sign in
**Problem:** Toggling between Sign up and Sign in flashed a white screen (a "hard
switch") and, after toggling signup→signin→signup, the "I'm joining as a…" role
picker reappeared.
**Cause:** The toggle used `router.replace` to navigate between two *separate*
routes (`/(auth)/signup` and `/(auth)/login`). Each tap unmounted/remounted a
screen (white frame during the fade), and going back to signup dropped the
`?role=` param.
**Fix:** Made the toggle switch **in place via state** — no navigation.
`PremiumAuthLayout` now owns `mode` + `role` and renders `SignupForm`/`LoginForm`
internally. Extracted `components/auth/SignupForm.tsx`, `LoginForm.tsx`,
`AuthFooter.tsx`. `_layout.tsx` got a brand-colored `contentStyle` so route entry
never flashes white.

---

## 2. Broken alignment everywhere (buttons/cards rendered unstyled) — NativeWind
**Problem:** The "Sign in"/"Create account" CTAs rendered as bare stacked text
(no green pill), search bars collapsed, cards lost their backgrounds. Looked like
"alignment is off" across the whole app.
**Cause:** **NativeWind v4's `cssInterop`** (auto-applied to RN core components via
`jsxImportSource: 'nativewind'`) **silently drops a function-form `style`** —
`style={({ pressed }) => …}` — leaving the element completely unstyled. Confirmed
on the simulator: a static style rendered fine; the same as a function did not.
React Compiler was ruled out (broke the same with it off).
**Fix:** Created `components/ui/SafePressable.tsx` — a drop-in `Pressable` that
resolves the function `style`/`children` to a STATIC value (via internal pressed
state) before handing it to RN's Pressable. Migrated ~29 components/screens to it;
fixed `Button` and `home/Press` directly. **Rule:** never put
`style={({pressed})=>…}` on a raw `react-native` Pressable — use
`@/components/ui/SafePressable`.

---

## 3. App didn't work without a backend
**Problem:** Every screen needs API data; there's no server running.
**Fix:** Demo/mock mode, ON by default (`USE_MOCKS` in `lib/env.ts`).
`lib/api.ts` swaps `api.defaults.adapter` for `lib/mockApi.ts`, which serves
`lib/mockData.ts` (a coherent India-locale dataset) and mutates it in place so
writes persist for the session. Login email picks the role (admin / business /
creator). Set `EXPO_PUBLIC_USE_MOCKS=false` to hit a real backend.

---

## 4. Home cards misaligned ("Finish before the clock runs" / "Featured" / "Fresh for you")
**Problem:** The reward text was long and unconstrained, shoving the action
button (Submit/Apply) off the card edge.
**Fix:** In `app/(creator)/(tabs)/home.tsx`, the reward `Text` now gets
`flex:1`/`flexShrink:1` + `numberOfLines={1}` (truncates with …) and the button
gets `flexShrink:0` so it's always fully visible. Also de-duplicated reward
wording in mock data (was "₹1,500 café voucher worth ₹1,500").

---

## 5. Collabs tab showed empty despite accepted collabs
**Cause:** The screen requests `status=Accepted,Overdue` (comma-separated) but the
mock did an exact-string match, so nothing matched.
**Fix:** `lib/mockApi.ts` `/applications` now splits `status` on commas and
matches any of them.

---

## 6. Rename Collably → CollabSpace
Replaced the visible wordmark + `app.json` display `name` + permission strings.
Intentionally kept the internal `slug`/`scheme` (`collably`) and deep-link host
(`collably.app`) so existing links don't break.

---

## 7. Intro/splash not showing (flashed for ~1ms)
**Problem:** The branded CollabSpace splash appeared for ~1 frame then vanished;
the onboarding "intro" seemed missing.
**Causes (two):**
1. The branded splash (`app/index.tsx`) only renders in the gap between the native
   splash hiding and the auth gate redirecting — and the gate redirected the
   *instant* boot finished, so it flashed.
2. The onboarding carousel only shows when **signed out**; a persisted session
   skipped it straight to Home (that's why it "wasn't showing").
**Fix:** Added a minimum-display window in `app/_layout.tsx`
(`SPLASH_MIN_MS`, currently **5000ms** for review — drop to ~1500 later). Key
detail: the countdown **starts when boot completes** (when the splash becomes
visible), NOT at mount — the first attempt started it at mount, so the Expo-Go
bundle-load time ate the whole 5s and it still flashed. The gate only redirects
once `booted && minElapsed`.

---

## 8. Light / Dark mode option
Added `store/themeStore.ts` (system | light | dark, persisted via SecureStore).
`ThemeProvider` reads it and drives NativeWind `setColorScheme`. A
System/Light/Dark segmented control (`components/shared/ThemeModeRow.tsx`) lives
in both Settings screens under "Appearance". Default is `system` (follows the OS).

---

## 9. Logo was a gift box, not the design's mark
**Problem:** The brand logo on auth/welcome/splash was a green gift box; the
design uses a connector glyph (outlined rounded square + two horizontal lines +
a small ring node on the left & right edges). Text size also didn't match.
**Fix:** Rebuilt `components/shared/BrandMark.tsx` with the real SVG mark
(`CollabMark`) and design proportions (wordmark = `size × 0.56`, letterSpacing
−0.8). Applied it on the auth screens (`PremiumAuthLayout`), `welcome.tsx`, and
the splash (`app/index.tsx`).

---

## 10. Location pickers were India-only
**Problem:** City/State/Country autocomplete only suggested Indian locations.
**Fix:** `lib/locations.ts` is now global — `CITIES` carries `{city, state,
country}` for India **plus** major international cities (US, UK, Canada, Australia,
UAE/Gulf, Asia-Pacific, Europe). Picking a city auto-fills its **region and
country** (`locationForCity`). `REGIONS` (India states + international regions) and
a broad `COUNTRIES` list feed the State and Country fields. The autocomplete still
allows free text, so anything not listed can be typed. Wired into creator/business
onboarding and the campaign-creation Step 3.

---

## 11. Standalone Android APK crashed on launch (worked in Expo Go)
**Symptom:** The release APK installed but closed instantly on open; Expo Go was fine.

**Why it happened:** `@expo/ui` (an **alpha** Expo native package) was in
`package.json` but **never imported in JS**. Expo native modules **auto-register at
app startup regardless of whether you import them**. `@expo/ui`'s native code needs
a newer `expo-modules-core` class (`ComposeViewFunctionDefinitionBuilder`) than
SDK 54 ships, so registration threw and took the whole app down **before the first
screen rendered**. Expo Go didn't crash because it bundles its *own* matched set of
native modules — so the broken one was never the one running. This is the classic
"works in Expo Go, crashes as a standalone build" trap: the JS bundle is identical;
only the **native module set** differs.

**The fatal log line (the smoking gun):**
```
FATAL EXCEPTION
java.lang.NoClassDefFoundError: Failed resolution of:
  Lexpo/modules/kotlin/views/ComposeViewFunctionDefinitionBuilder;
    at expo.modules.ui.ExpoUIModule.definition(ExpoUIModule.kt:177)
    ... expo.modules.kotlin.ModuleRegistry.register ...
```

**How we debugged it — wireless debugging (no USB cable):**
The Mac had no Android SDK and the user didn't want to plug in. We used `adb` over
Wi-Fi (phone + Mac on the same network):
1. Install adb only: `brew install android-platform-tools`.
2. Phone: Settings → Developer options → **Wireless debugging** ON → **Pair device
   with pairing code** (shows a 6-digit code + an `ip:pairPort`).
3. Mac: `adb pair <ip:pairPort> <code>` (the code is single-use and expires in
   seconds — pair immediately; reopen the dialog for a fresh one if it faults).
4. From the **main** Wireless-debugging screen take the `ip:connectPort` (different
   port) → `adb connect <ip:connectPort>`.
5. `adb -s <ip:connectPort> logcat -c` (clear), open the app so it crashes, then
   `adb -s <ip:connectPort> logcat -d | grep -iE "FATAL|AndroidRuntime"`.
   (Use `-s` — pairing leaves two transport entries for one device.)
6. Turn Wireless debugging OFF when done.

**Fix:** `npm uninstall @expo/ui expo-glass-effect expo-symbols` (all unused alpha
native modules — removed to prevent the same class of crash), bumped `version`
0.1.0 → 0.1.1, rebuilt. It launched fine.
**Rule:** never keep unused alpha/experimental Expo native packages in deps — they
auto-link and can crash standalone builds even when never imported.

---

## 12. Rich demo data (images + cards) in the live backend
**Goal:** the live app (real backend) was showing plain seed data; we wanted the
original image-rich "CollabSpace" world (Saffron Table / Bloom Beauty / etc. with
cover photos, logos, avatars) but only a couple of logins to remember.
**How:** rewrote `backend/src/scripts/seed.ts` to insert the app's original mock
dataset (recovered from git commit `6e2cd87:mobile/lib/mockData.ts`) mapped to the
Mongoose models — 12 users, 5 businesses, 6 creators, 12 image-rich campaigns, 12
applications (all lifecycle states), 7 notifications, 3 reports. String ids are
wired to real ObjectIds via lookup Maps; notification deepLinks rebuilt with real
ids. Ran `npm run build && npm run seed` against Atlas (reads `backend/.env`).
**Key facts:**
- **No APK rebuild needed** — the app fetches from the backend, so re-seeding the
  DB makes the existing v0.1.2 APK show the new data on reload.
- Advertised logins (password `Password123`): `priya@collably.app` (creator),
  `hello@saffrontable.in` (business), `admin@collably.app`. Other accounts exist as
  data so feeds/applicant lists look full.
- Seed is **destructive** (wipes + reseeds); re-run any time to reset the demo.
- Images are Unsplash URLs → load online (need internet, not offline).

---

### Verifying on the iOS simulator (no tap tooling available)
- Drive screens with deep links after a cold restart:
  `xcrun simctl terminate <UDID> host.exp.Exponent` then
  `xcrun simctl openurl <UDID> "exp://<LAN-IP>:8082/--/<path>"`.
- Sign out by clearing the keychain: `xcrun simctl keychain <UDID> reset`.
- Toggle OS dark mode: `xcrun simctl ui <UDID> appearance dark|light`.
- Screenshot: `xcrun simctl io <UDID> screenshot /tmp/x.png`.
