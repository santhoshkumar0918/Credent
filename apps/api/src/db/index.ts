import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/vouchain";

// Memory store fallback when Postgres DB is unreachable in dev
export class MemoryDbStore {
  users = new Map<string, any>();
  roles = new Map<string, any[]>();
  pseudonyms = new Map<string, any[]>();
  lenderKeys = new Map<string, string>();
  consentTokens = new Map<string, any>();
  notifications = new Map<string, any[]>();
  demoState = new Map<string, any>();
}

export const memoryStore = new MemoryDbStore();

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

try {
  const client = postgres(connectionString, { max: 5, idle_timeout: 20, connect_timeout: 5 });
  dbInstance = drizzle(client, { schema });
} catch {
  console.warn("⚠️ Postgres connection failed, using in-memory store fallback");
}

export const db = dbInstance;
