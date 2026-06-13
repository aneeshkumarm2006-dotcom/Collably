import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './lib/env';
import { connectDB, disconnectDB } from './lib/db';

/** Entry point: connect the DB (non-fatal), then start the HTTP server. */
async function main(): Promise<void> {
  // Kick off the DB connection but don't block server startup on it — the
  // health endpoint must be reachable even while the DB is (re)connecting.
  void connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] Collably API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[server] health check: http://localhost:${env.port}/api/health`);
  });

  registerShutdown(server);
}

/** Close the HTTP server and DB connection cleanly on termination signals. */
function registerShutdown(server: Server): void {
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    server.close(() => {
      void disconnectDB().finally(() => process.exit(0));
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
