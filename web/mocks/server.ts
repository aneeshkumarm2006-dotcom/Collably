/**
 * MSW node server — the interception point for mock mode. Started from
 * `instrumentation.ts` when `NEXT_PUBLIC_USE_MOCKS=true`. Because the browser only
 * ever talks to same-origin Next routes (the proxy + route handlers), every
 * backend-bound `fetch` — SSR reads via `serverApi` AND browser reads forwarded by
 * the proxy — originates in THIS node process, so one server intercepts them all.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
