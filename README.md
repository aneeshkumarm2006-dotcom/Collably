# Collably

A two-sided **influencer ↔ brand collab & gifting marketplace** mobile app.
Businesses post gifting campaigns (e.g. _"Make a 60-sec Reel at our cafe, get a
free meal for two"_); creators browse, apply, create the content, and submit
proof; businesses verify and fulfil the reward.

- **Mobile app:** Expo (React Native) + Expo Router + NativeWind + Zustand
- **Backend:** standalone Express.js + TypeScript REST API, MongoDB (Mongoose)
- **Services:** Cloudinary (images), Resend (email), Expo Push (notifications)
- **Identifiers:** app name `Collably`, bundle/package `com.collably.app`, scheme `collably://`

> Full product spec: [`../_ai_context/Influencer Gifting Platforms PRD.md`](../_ai_context/Influencer%20Gifting%20Platforms%20PRD.md)
> Build plan / phase checklist: [`../_ai_context/TODO.md`](../_ai_context/TODO.md)

## Monorepo layout

```
app/
├── backend/    Express + TypeScript REST API        (built in Phase 2+)
├── mobile/     Expo React Native app                 (built in Phase 7+)
├── shared/     Types + constants shared by both
│   ├── types/        User, BusinessProfile, CreatorProfile,
│   │                 Campaign, Application, Notification (PRD §5)
│   └── constants/    categories, niches, contentTypes,
│                     platforms, rewards, statuses
├── eslint.config.mjs   Shared ESLint 9 (flat) config
├── tsconfig.base.json  Shared TS compiler options (backend/mobile extend this)
└── .prettierrc.json    Shared formatting rules
```

## Prerequisites

- Node.js ≥ 20 (developed on v24)
- Git
- `eas-cli` (`npm install -g eas-cli`) for builds
- Expo Go on a physical device for live testing

Account setup (MongoDB Atlas, Cloudinary, Resend, Expo, hosting, Google OAuth,
store accounts) is documented in
[`../_ai_context/Phase 0 — Setup/SETUP-GUIDE.md`](../_ai_context/Phase%200%20%E2%80%94%20Setup/SETUP-GUIDE.md).

## Getting started (root tooling)

```bash
cd app
npm install        # installs shared dev tooling (ESLint, Prettier, TypeScript)

npm run typecheck  # type-check the shared/ package
npm run lint       # lint the repo
npm run format     # auto-format with Prettier
```

### Backend (after Phase 2)

```bash
cd app/backend
npm install
npm run dev        # http://localhost:4000 — GET /api/health
```

### Mobile (after Phase 7)

```bash
cd app/mobile
npm install
npx expo start     # scan the QR code with Expo Go
```

## Using the shared package

Both sides import domain types and constants from `shared/` so the API contract
stays in one place:

```ts
import type { Campaign, Application } from '../shared/types';
import { REWARD_TYPES, canTransitionCampaign } from '../shared/constants';
```

## License

Private / unpublished. © Collably.
