import mongoose from 'mongoose';
import { env } from './env';

/**
 * MongoDB connection via Mongoose, with bounded exponential-backoff retry and
 * logging. Connecting is intentionally non-fatal: if `MONGODB_URI` is unset or
 * the database is unreachable, the HTTP server still boots so `/api/health`
 * stays reachable (it reports the DB state). Set up Atlas in Phase 0 to make
 * data-backed routes work.
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/** Map Mongoose's numeric readyState to a human-readable label. */
export function dbStatus(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  // readyState is 0|1|2|3 (and 99 = uninitialized, treated as disconnected).
  const states: Record<number, ReturnType<typeof dbStatus>> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'disconnected';
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempt to connect to MongoDB, retrying with backoff. Resolves to `true` on
 * success and `false` if no URI is configured or all retries are exhausted —
 * it never throws, so a missing DB can't take the server down at boot.
 */
export async function connectDB(): Promise<boolean> {
  if (!env.mongodbUri) {
    console.warn(
      '[db] MONGODB_URI is not set — skipping connection. The API will run but ' +
        'data-backed routes will fail until Atlas is configured (see Phase 0 §2a).',
    );
    return false;
  }

  // Buffer commands while (re)connecting rather than throwing immediately.
  mongoose.set('bufferCommands', true);
  // Surface real schema-path mistakes early instead of silently dropping them.
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log('[db] connected to MongoDB');
      registerConnectionListeners();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.error(`[db] connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`[db] retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error('[db] all connection attempts failed — continuing without a database');
  return false;
}

/** Log connection lifecycle events once an initial connection is made. */
function registerConnectionListeners(): void {
  const { connection } = mongoose;
  connection.on('disconnected', () => console.warn('[db] disconnected from MongoDB'));
  connection.on('reconnected', () => console.log('[db] reconnected to MongoDB'));
  connection.on('error', (err) => console.error('[db] connection error:', err.message));
}

/** Close the connection cleanly (used during graceful shutdown). */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[db] connection closed');
  }
}
