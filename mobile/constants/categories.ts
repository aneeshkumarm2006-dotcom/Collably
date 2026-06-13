/**
 * Re-export of the shared category constants so app code imports from
 * `@/constants` and never reaches across the workspace boundary directly.
 * Single source of truth lives in `app/shared/constants/categories.ts`.
 */
export * from '../../shared/constants/categories';
