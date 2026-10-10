import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dir, "..");
const ROOT_ENV_FILE = fs.existsSync(path.join(ROOT_DIR, ".env"))
  ? path.join(ROOT_DIR, ".env")
  : path.join(ROOT_DIR, ".env.example");

console.log(`📡 Reading root environment from: ${ROOT_ENV_FILE}`);
const envContent = fs.readFileSync(ROOT_ENV_FILE, "utf-8");

// Parse KEY=VALUE
const envVars = new Map<string, string>();
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    envVars.set(key, val);
  }
}

// 1. Frontend target (.env.local)
const frontendEnv = [
  "# Auto-synced from root environment",
  `NEXT_PUBLIC_API_URL=${envVars.get("NEXT_PUBLIC_API_URL") || "http://localhost:3001"}`,
  `NEXT_PUBLIC_AGENTS_URL=${envVars.get("NEXT_PUBLIC_AGENTS_URL") || "http://localhost:3003"}`,
  `NEXT_PUBLIC_INDEXER_URL=${envVars.get("NEXT_PUBLIC_INDEXER_URL") || "http://localhost:3111"}`,
  `NEXT_PUBLIC_DEMO_MODE=${envVars.get("NEXT_PUBLIC_DEMO_MODE") || "true"}`,
  `NEXT_PUBLIC_PRIVY_APP_ID=${envVars.get("NEXT_PUBLIC_PRIVY_APP_ID") || envVars.get("PRIVY_APP_ID") || ""}`,
].join("\n");
fs.writeFileSync(path.join(ROOT_DIR, "frontend", ".env.local"), frontendEnv);
console.log("✓ Synced frontend/.env.local");

// 2. Platform Simulator target (.env.local)
const platformSimEnv = [
  "# Auto-synced from root environment",
  `PORT=3002`,
  `PLATFORM_PRIVATE_KEY=${envVars.get("NEW_PLATFORM_ATTESTER_PRIVATE_KEY") || envVars.get("PLATFORM_PRIVATE_KEY") || ""}`,
  `NEW_PLATFORM_ATTESTER_PRIVATE_KEY=${envVars.get("NEW_PLATFORM_ATTESTER_PRIVATE_KEY") || ""}`,
  `REDTEAM_ATTESTER_1_PRIVATE_KEY=${envVars.get("REDTEAM_ATTESTER_1_PRIVATE_KEY") || ""}`,
  `REDTEAM_ATTESTER_2_PRIVATE_KEY=${envVars.get("REDTEAM_ATTESTER_2_PRIVATE_KEY") || ""}`,
  `REDTEAM_ATTESTER_3_PRIVATE_KEY=${envVars.get("REDTEAM_ATTESTER_3_PRIVATE_KEY") || ""}`,
  `AGENTS_SERVICE_URL=${envVars.get("AGENTS_SERVICE_URL") || "http://localhost:3003"}`,
  `MONAD_RPC_URL=${envVars.get("MONAD_RPC_URL") || "https://testnet-rpc.monad.xyz"}`,
  `NEXT_PUBLIC_PRIVY_APP_ID=${envVars.get("NEXT_PUBLIC_PRIVY_APP_ID") || envVars.get("PRIVY_APP_ID") || ""}`,
].join("\n");
fs.writeFileSync(path.join(ROOT_DIR, "apps", "platform-sim", ".env.local"), platformSimEnv);
console.log("✓ Synced apps/platform-sim/.env.local");

// 3. API Server target (.env)
const apiEnv = [
  "# Auto-synced from root environment",
  `PORT=3001`,
  `DATABASE_URL=${envVars.get("DATABASE_URL") || ""}`,
  `PRIVY_APP_ID=${envVars.get("PRIVY_APP_ID") || ""}`,
  `PRIVY_APP_SECRET=${envVars.get("PRIVY_APP_SECRET") || ""}`,
  `RELAYER_PRIVATE_KEY=${envVars.get("RELAYER_PRIVATE_KEY") || ""}`,
  `ARBITER_PRIVATE_KEY=${envVars.get("ARBITER_PRIVATE_KEY") || ""}`,
  `ADMIN_PASSWORD=${envVars.get("ADMIN_PASSWORD") || ""}`,
  `SERVICE_API_KEY=${envVars.get("SERVICE_API_KEY") || ""}`,
  `INDEXER_URL=${envVars.get("INDEXER_URL") || "http://localhost:3111"}`,
  `AGENTS_SERVICE_URL=${envVars.get("AGENTS_SERVICE_URL") || "http://localhost:3003"}`,
  `MONAD_RPC_URL=${envVars.get("MONAD_RPC_URL") || "https://testnet-rpc.monad.xyz"}`,
  `STRICT_ONCHAIN_CONSENT=${envVars.get("STRICT_ONCHAIN_CONSENT") || "true"}`,
].join("\n");
fs.writeFileSync(path.join(ROOT_DIR, "apps", "api", ".env"), apiEnv);
console.log("✓ Synced apps/api/.env");

// 4. Agents Service target (.env)
const agentsEnv = [
  "# Auto-synced from root environment",
  `PORT=3003`,
  `PLATFORM_PRIVATE_KEY=${envVars.get("NEW_PLATFORM_ATTESTER_PRIVATE_KEY") || envVars.get("PLATFORM_PRIVATE_KEY") || ""}`,
  `WATCHER_PRIVATE_KEY=${envVars.get("WATCHER_PRIVATE_KEY") || envVars.get("CHALLENGER_PRIVATE_KEY") || ""}`,
  `CHALLENGER_PRIVATE_KEY=${envVars.get("WATCHER_PRIVATE_KEY") || envVars.get("CHALLENGER_PRIVATE_KEY") || ""}`,
  `SERVICE_API_KEY=${envVars.get("SERVICE_API_KEY") || ""}`,
  `API_URL=${envVars.get("API_URL") || "http://localhost:3001"}`,
  `INDEXER_URL=${envVars.get("INDEXER_URL") || "http://localhost:3111"}`,
  `PLATFORM_SIM_URL=${envVars.get("PLATFORM_SIM_URL") || "http://localhost:3002"}`,
  `PINATA_JWT=${envVars.get("PINATA_JWT") || ""}`,
  `MONAD_RPC_URL=${envVars.get("MONAD_RPC_URL") || "https://testnet-rpc.monad.xyz"}`,
].join("\n");
fs.writeFileSync(path.join(ROOT_DIR, "apps", "agents", ".env"), agentsEnv);
console.log("✓ Synced apps/agents/.env");

// 5. Indexer target (.env)
const indexerEnv = [
  "# Auto-synced from root environment",
  `PORT=3111`,
  `DATABASE_URL=${envVars.get("DATABASE_URL") || ""}`,
  `REDIS_URL=${envVars.get("REDIS_URL") || ""}`,
  `MONAD_RPC_URL=${envVars.get("MONAD_RPC_URL") || "https://testnet-rpc.monad.xyz"}`,
].join("\n");
fs.writeFileSync(path.join(ROOT_DIR, "indexer", ".env"), indexerEnv);
console.log("✓ Synced indexer/.env");

console.log("🎉 All workspace environments synced successfully!");
