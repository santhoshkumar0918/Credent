// Postgres access for the attestation graph (ticket I1).
// Read-only mirror of chain events. Commitments + statuses only —
// disclosed values are never persisted here.

import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

/// @notice Applies schema.sql statement by statement. The schema file is
/// plain DDL with full-line `--` comments only: comment lines are stripped
/// first (a naive ";" split would otherwise chop a comment mid-sentence and
/// poison the following statement), then the remainder splits cleanly.
export async function applySchema(pool: Pool): Promise<void> {
  const dir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(dir, "..", "schema.sql"), "utf8");
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      if (
        stmt.includes("CREATE TABLE") ||
        stmt.includes("CREATE INDEX") ||
        stmt.includes("ALTER TABLE") ||
        // Idempotent seed rows (ON CONFLICT DO NOTHING) — lets a fresh
        // database self-initialize attester rows whose registration events
        // predate any sync cursor (e.g. fresh cloud deploys).
        stmt.includes("INSERT INTO")
      ) {
        await client.query(stmt);
      }
    }
  } finally {
    client.release();
  }
}

export async function getCursor(pool: Pool, fallback: bigint): Promise<bigint> {
  const { rows } = await pool.query("SELECT block_number FROM indexer_cursor WHERE id = 1");
  if (rows.length === 0) return fallback;
  return BigInt(rows[0].block_number as string);
}

export async function setCursor(pool: Pool, blockNumber: bigint): Promise<void> {
  await pool.query(
    `INSERT INTO indexer_cursor (id, block_number) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET block_number = EXCLUDED.block_number`,
    [blockNumber.toString()]
  );
}

/// @notice Refresh an attester row from chain truth (called on any
/// attester-mutating event — fewer branches, always correct).
export async function refreshAttester(
  pool: Pool,
  address: string,
  row: {
    attesterType: number;
    bond: bigint;
    reputationScore: bigint;
    attestationCount: bigint;
    challengesLost: bigint;
    active: boolean;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO attesters
       (address, attester_type, bond, reputation_score, attestation_count, challenges_lost, active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (address) DO UPDATE SET
       attester_type = EXCLUDED.attester_type,
       bond = EXCLUDED.bond,
       reputation_score = EXCLUDED.reputation_score,
       attestation_count = EXCLUDED.attestation_count,
       challenges_lost = EXCLUDED.challenges_lost,
       active = EXCLUDED.active,
       updated_at = now()`,
    [
      address.toLowerCase(),
      row.attesterType,
      row.bond.toString(),
      row.reputationScore.toString(),
      row.attestationCount.toString(),
      row.challengesLost.toString(),
      row.active,
    ]
  );
}

export async function insertAttestation(
  pool: Pool,
  row: {
    id: bigint;
    attester: string;
    subjectPseudonym: string;
    eventType: string;
    commitmentHash: string;
    evidenceHash: string;
    blockNumber: bigint;
    blockTimestamp: Date | null;
    txHash: string;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO attestations
       (id, attester, subject_pseudonym, event_type, commitment_hash, evidence_hash, block_number, block_timestamp, tx_hash, status)
     VALUES ($1, $2, $3, $4, $5, NULLIF($6, '0x0000000000000000000000000000000000000000000000000000000000000000'), $7, $8, $9, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [
      row.id.toString(),
      row.attester.toLowerCase(),
      row.subjectPseudonym,
      row.eventType,
      row.commitmentHash,
      row.evidenceHash,
      row.blockNumber.toString(),
      row.blockTimestamp,
      row.txHash,
    ]
  );
}

export async function updateAttestationStatus(
  pool: Pool,
  id: bigint,
  status: string
): Promise<void> {
  await pool.query("UPDATE attestations SET status = $2 WHERE id = $1", [id.toString(), status]);
}

export async function upsertConsent(
  pool: Pool,
  row: { subjectPseudonym: string; viewer: string; scopeTags: string[]; expiry: Date }
): Promise<void> {
  await pool.query(
    `INSERT INTO consents (subject_pseudonym, viewer, scope_tags, expiry, revoked, updated_at)
     VALUES ($1, $2, $3, $4, FALSE, now())
     ON CONFLICT (subject_pseudonym, viewer) DO UPDATE SET
       scope_tags = EXCLUDED.scope_tags, expiry = EXCLUDED.expiry,
       revoked = FALSE, updated_at = now()`,
    [row.subjectPseudonym, row.viewer.toLowerCase(), row.scopeTags, row.expiry]
  );
}

export async function revokeConsent(pool: Pool, subjectPseudonym: string, viewer: string): Promise<void> {
  await pool.query(
    "UPDATE consents SET revoked = TRUE, updated_at = now() WHERE subject_pseudonym = $1 AND viewer = $2",
    [subjectPseudonym, viewer.toLowerCase()]
  );
}

/// @notice Refresh a challenge row from chain truth (status machine + bond).
export async function refreshChallenge(
  pool: Pool,
  row: {
    id: bigint;
    attestationId: bigint;
    challenger: string;
    challengerBond: bigint;
    windowEnds: bigint;
    status: string;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO challenges (id, attestation_id, challenger, challenger_bond, window_ends, status)
     VALUES ($1, $2, $3, $4, to_timestamp($5::double precision), $6)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
    [
      row.id.toString(),
      row.attestationId.toString(),
      row.challenger.toLowerCase(),
      row.challengerBond.toString(),
      Number(row.windowEnds),
      row.status,
    ]
  );
}
