/**
 * Single import surface for the monorepo's canonical domain layer.
 *
 * The website reuses the EXACT same types + constants as the backend and the Expo
 * app. It does not redefine them. They live in the root `shared/` package and are
 * wired here through the `@shared/*` TS path alias (→ `../shared/*`), with
 * `experimental.externalDir` in `next.config.js` letting Next compile that
 * out-of-app source. See README → "Shared types".
 *
 * Usage:
 *   import type { Campaign, Application } from '@/lib/shared';
 *   import { REWARD_TYPES, canTransitionCampaign } from '@/lib/shared';
 */
export * from '@shared/index';
