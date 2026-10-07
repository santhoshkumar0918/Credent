import { pgTable, text, timestamp, boolean, uuid, bigint, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  privyDid: text("privy_did").notNull().unique(),
  walletAddress: text("wallet_address"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // 'SUBJECT' | 'ATTESTER' | 'LENDER' | 'WATCHER'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pseudonyms = pgTable("pseudonyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  attesterAddress: text("attester_address").notNull(),
  pseudonymHex: text("pseudonym_hex").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lenderKeys = pgTable("lender_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  publicKeyHex: text("public_key_hex").notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const consentTokens = pgTable("consent_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  pseudonymHex: text("pseudonym_hex").notNull(),
  viewerAddress: text("viewer_address").notNull(),
  scopeTags: jsonb("scope_tags").$type<string[]>().notNull(),
  expiry: bigint("expiry", { mode: "number" }).notNull(),
  encryptedKeyHex: text("encrypted_key_hex"),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  channel: text("channel").notNull(), // 'SMS' | 'WHATSAPP' | 'IN_APP'
  message: text("message").notNull(),
  status: text("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const demoState = pgTable("demo_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
