import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the unit (utils + API mappers) and component (shared
 * components, light/dark + states) tests — Phase 14. Playwright E2E lives under
 * `e2e/` with its own runner (`playwright.config.ts`) and is excluded here.
 *
 * Path aliases mirror `tsconfig.json` (`@/*` → this app, `@shared/*` → the
 * monorepo `shared/` package); `server.fs.allow` lets Vite import that
 * out-of-app source the same way `experimental.externalDir` does for Next.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@shared\/(.*)$/, replacement: path.resolve(__dirname, '../shared') + '/$1' },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname) + '/$1' },
    ],
  },
  server: {
    // Allow importing the sibling `../shared` package (outside this app dir).
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', '.next-mock', '.next-prod', 'e2e'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    css: false,
  },
});
