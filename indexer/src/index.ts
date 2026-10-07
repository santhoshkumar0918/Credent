// Indexer entrypoint (ticket I1): apply schema, tail the chain forever.
// Env: DATABASE_URL (default: local compose Postgres), MONAD_RPC_URL.
// Shutdown: SIGINT/SIGTERM aborts the poll loop after the current batch.

import { applySchema, createPool } from "./db.js";
import { runSubscriber } from "./subscriber.js";

export {};

const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgres://credent:credent@localhost:5432/credent";
const rpcUrl = process.env["MONAD_RPC_URL"] ?? "https://testnet-rpc.monad.xyz";

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
process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());

await runSubscriber({ rpcUrl, pool }, controller.signal);
await pool.end();
