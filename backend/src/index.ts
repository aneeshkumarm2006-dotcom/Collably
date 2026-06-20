import dns from 'node:dns';
import type { Server } from 'node:http';
import { createApp } from './app';

// Some local networks (e.g. router DNS at 192.168.1.1) refuse the SRV-record
// lookups that `mongodb+srv://` requires, which surfaces as
// `querySrv ECONNREFUSED`. Force Node's resolver to public DNS so Atlas always
// resolves regardless of the local network.
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { env, assertSecureConfig } from './lib/env';
import { connectDB, disconnectDB } from './lib/db';
import { initRealtime, shutdownRealtime } from './lib/realtime';

/** Entry point: connect the DB (non-fatal), then start the HTTP server. */
async function main(): Promise<void> {
  // Fail closed on insecure config (weak JWT secret / wildcard CORS) in prod.
  assertSecureConfig();

  // Kick off the DB connection but don't block server startup on it — the
  // health endpoint must be reachable even while the DB is (re)connecting.
  void connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] Collably API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[server] health check: http://localhost:${env.port}/api/health`);
  });

  // Attach the Socket.io chat transport to the same HTTP server.
  initRealtime(server);

  registerShutdown(server);
}

/** Close the HTTP server and DB connection cleanly on termination signals. */
function registerShutdown(server: Server): void {
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    void shutdownRealtime().finally(() => {
      server.close(() => {
        void disconnectDB().finally(() => process.exit(0));
      });
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
