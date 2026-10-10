// Indexer entrypoint (tickets I1–I2): apply schema, tail the chain, serve
// the CreditAggregator API on PORT (default 3111 — 3000 stays free for the
// Next.js dev server).
// Env: DATABASE_URL (default: local compose Postgres), MONAD_RPC_URL,
// REDIS_URL (default: local compose Redis), PORT.
// Shutdown: SIGINT/SIGTERM aborts the poll loop after the current batch.

import { createPublicClient, http } from "viem";
import Redis from "ioredis";
import { applySchema, createPool } from "./db.js";
import { runSubscriber } from "./subscriber.js";
import { router, type ApiContext } from "./api.js";

export {};

const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgres://credent:credent@localhost:5432/credent";
const rpcUrl = process.env["MONAD_RPC_URL"] ?? "https://testnet-rpc.monad.xyz";
const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const port = Number(process.env["PORT"] ?? 3111);

const pool = createPool(databaseUrl);
// The DB container may still be initializing when the indexer boots
// (compose starts both together) — retry instead of crashing.
for (let attempt = 1; ; attempt++) {
  try {
    await applySchema(pool);
    break;
  } catch (err) {
    if (attempt >= 15) throw err;
    console.log(`postgres not ready (attempt ${attempt}), retrying…`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
console.log("credent indexer: schema ready, subscribing from deploy cursor");

const controller = new AbortController();
// Immediate exit on signal is safe: the cursor advances only after a batch
// fully persists, and all writes are idempotent (upserts / refresh-overwrite),
// so a killed batch is simply replayed on restart. (A graceful drain would
// hang restarts inside long RPC loops.)
const shutdown = () => process.exit(0);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const inMemoryCache = new Map<string, { val: string; exp: number }>();

let redisClient: InstanceType<typeof Redis> | null = null;
try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redisClient.on("error", () => {
    // Suppress unhandled error event when local Redis is not running
  });
} catch {
  // Fall back to inMemoryCache
}

const cache = {
  async get(key: string) {
    if (redisClient && redisClient.status === "ready") {
      try {
        return await redisClient.get(key);
      } catch {}
    }
    const item = inMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.exp) {
      inMemoryCache.delete(key);
      return null;
    }
    return item.val;
  },
  async setex(key: string, seconds: number, val: string) {
    if (redisClient && redisClient.status === "ready") {
      try {
        return await redisClient.setex(key, seconds, val);
      } catch {}
    }
    inMemoryCache.set(key, { val, exp: Date.now() + seconds * 1000 });
  },
  disconnect() {
    try {
      redisClient?.disconnect();
    } catch {}
  },
};

const ctx: ApiContext = {
  pool,
  client: createPublicClient({ transport: http(rpcUrl) }),
  redis: cache,
};

const server = Bun.serve({ port, fetch: router(ctx) });
console.log(`credent api: listening on :${server.port}`);

// The poll loop never resolves cleanly; a throw here is fatal.
runSubscriber({ rpcUrl, pool }, controller.signal).catch(async (err) => {
  console.error("subscriber fatal:", err);
  server.stop();
  ctx.redis.disconnect();
  await pool.end();
  process.exit(1);
});
