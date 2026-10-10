// CreditAggregator REST surface, PRD §11 (ticket I2).
// Served by Bun.serve from index.ts. Fail-closed: any doubt about consent
// (no grant, expired, revoked, Redis down, chain unreachable) denies.
//
// Privacy design note (deviation from PRD §11, deliberate): the summary
// serves EXISTENCE + COVERAGE stats only — counts, diversity, tenure,
// disputes, and the full attestation enumeration. It does NOT serve
// onTimeRate: computing that would require plaintext amounts in the
// indexer, violating the commitment architecture. Lenders compute
// onTimeRate from the disclosures they hold, and check COMPLETENESS
// against the enumeration below (a subject who withholds an attestation
// is caught because the lender sees the id gap). That check is the
// adverse-selection answer.

import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { PublicClient } from "viem";
import type Redis from "ioredis";
import { grantExpiry, hasLiveGrant, hasLiveScope } from "./consent.js";

export interface CacheClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, val: string): Promise<unknown>;
  disconnect?(): void;
}

export interface ApiContext {
  pool: Pool;
  client: PublicClient;
  redis: CacheClient;
}

const TOKEN_TTL_SECONDS = 900;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

interface StoredToken {
  pseudonym: string;
  viewer: string;
}

async function readToken(ctx: ApiContext, req: Request): Promise<StoredToken | null> {
  const token = req.headers.get("X-Consent-Token");
  if (!token) return null;
  try {
    const raw = await ctx.redis.get(`consent:${token}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null; // Redis down → no token → denied (fail-closed).
  }
}

/// POST /consent/verify { subjectPseudonym, viewer, scopeTag? }
/// Live chain check; on success issues a 15-minute consent token.
export async function handleVerify(ctx: ApiContext, req: Request): Promise<Response> {
  let body: { subjectPseudonym?: string; viewer?: string; scopeTag?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ authorized: false, error: "invalid JSON body" }, 400);
  }
  const { subjectPseudonym, viewer, scopeTag } = body;
  if (!subjectPseudonym || !viewer) {
    return json({ authorized: false, error: "subjectPseudonym and viewer are required" }, 400);
  }
  try {
    const ok = scopeTag
      ? await hasLiveScope(ctx.client, subjectPseudonym, viewer, scopeTag)
      : await hasLiveGrant(ctx.client, subjectPseudonym, viewer);
    if (!ok) return json({ authorized: false }, 403);
    const expiry = await grantExpiry(ctx.client, subjectPseudonym, viewer);
    const token = randomBytes(32).toString("hex");
    await ctx.redis.setex(
      `consent:${token}`,
      TOKEN_TTL_SECONDS,
      JSON.stringify({ pseudonym: subjectPseudonym, viewer })
    );
    return json({
      authorized: true,
      expiry: new Date(Number(expiry) * 1000).toISOString(),
      token,
    });
  } catch {
    return json({ authorized: false, error: "consent check unavailable" }, 503);
  }
}

/// GET /subjects/:pseudonym/summary — token-gated, chain-revalidated.
export async function handleSummary(
  ctx: ApiContext,
  pseudonym: string,
  req: Request
): Promise<Response> {
  const token = await readToken(ctx, req);
  if (!token || token.pseudonym.toLowerCase() !== pseudonym.toLowerCase()) {
    return json({ error: "missing or mismatched X-Consent-Token (POST /consent/verify first)" }, 401);
  }
  try {
    const live = await hasLiveGrant(ctx.client, pseudonym, token.viewer);
    if (!live) return json({ error: "grant revoked, expired, or withdrawn" }, 403);
  } catch {
    return json({ error: "consent revalidation unavailable" }, 503);
  }
  const { rows: agg } = await ctx.pool.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
            COUNT(*) FILTER (WHERE status = 'CHALLENGED') AS challenged,
            COUNT(*) FILTER (WHERE status = 'SLASHED') AS slashed,
            COUNT(DISTINCT attester) AS diversity,
            MIN(block_timestamp) AS first_seen,
            MAX(block_timestamp) AS last_seen
     FROM attestations WHERE subject_pseudonym = $1`,
    [pseudonym]
  );
  const { rows: items } = await ctx.pool.query(
    `SELECT id, attester, event_type, block_timestamp, status
     FROM attestations WHERE subject_pseudonym = $1 ORDER BY id`,
    [pseudonym]
  );
  const a = agg[0] as Record<string, string>;
  const tenureDays =
    a["first_seen"] && a["last_seen"]
      ? Math.max(
          0,
          Math.round(
            (new Date(a["last_seen"]).getTime() - new Date(a["first_seen"]).getTime()) / 86400000
          )
        )
      : 0;
  return json({
    attestationCount: Number(a["total"]),
    activeCount: Number(a["active"]),
    attesterDiversity: Number(a["diversity"]),
    tenureDays,
    disputeCount: Number(a["challenged"]) + Number(a["slashed"]),
    challengedCount: Number(a["challenged"]),
    slashedCount: Number(a["slashed"]),
    attestations: items,
    coverageNote:
      "Enumerated for completeness checking: demand disclosure for EVERY id listed. " +
      "onTimeRate is intentionally not served — compute it lender-side from " +
      "re-verified disclosures (see module NatSpec).",
  });
}

/// GET /attesters/:address/reputation — public mirror with freshness note.
export async function handleReputation(ctx: ApiContext, address: string): Promise<Response> {
  const { rows } = await ctx.pool.query(
    `SELECT address, attester_type, bond, reputation_score, attestation_count,
            challenges_lost, active, updated_at
     FROM attesters WHERE address = $1`,
    [address.toLowerCase()]
  );
  if (rows.length === 0) return json({ error: "unknown attester" }, 404);
  return json({ ...rows[0], mirrorNote: "read-only mirror of on-chain state; verify on-chain for settlement" });
}

export function router(ctx: ApiContext): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/consent/verify") {
      return handleVerify(ctx, req);
    }
    const subject = url.pathname.match(/^\/subjects\/([^/]+)\/summary$/);
    if (req.method === "GET" && subject) {
      return handleSummary(ctx, subject[1] as string, req);
    }
    const attester = url.pathname.match(/^\/attesters\/([^/]+)\/reputation$/);
    if (req.method === "GET" && attester) {
      return handleReputation(ctx, attester[1] as string);
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  };
}
