// Slice 3 — indexer-aggregator-agent builds per prd/Credent-prd.md §11:
// JSON-RPC subscription → Postgres materialized graph → CreditAggregator API.
// Read-only mirror: never originates chain state.

export {};

async function main(): Promise<void> {
  console.log("credent indexer — skeleton (slice 3 builds the subscriber + API)");
}

await main();
