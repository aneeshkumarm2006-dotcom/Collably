/**
 * MSW browser worker: OPTIONAL. In this app's architecture the browser never
 * calls the backend directly (it goes through the same-origin proxy, intercepted
 * node-side in `mocks/server.ts`), so this worker isn't started by default. It's
 * kept for the case where a future feature fetches the backend straight from the
 * client; to enable it, run `npx msw init public/` once and call
 * `worker.start({ onUnhandledRequest: 'bypass' })` from a client init.
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
