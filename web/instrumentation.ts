/**
 * Next.js instrumentation hook. Runs once per server process at startup. When
 * mock mode is on (`NEXT_PUBLIC_USE_MOCKS=true`) it starts the MSW node server so
 * every backend-bound `fetch` (SSR + the same-origin proxy) is served from the
 * in-memory dataset instead of hitting a real backend. No-op on the Edge runtime
 * and in normal (non-mock) mode.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { server } = await import('./mocks/server');
    // `bypass` lets non-API requests (Next assets, Cloudinary images) pass through.
    server.listen({ onUnhandledRequest: 'bypass' });
    // eslint-disable-next-line no-console
    console.log('[mocks] MSW node server started, running against in-memory data.');
  }
}
