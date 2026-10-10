"use client";

// /explorer — the public attestation lookup. Enter an attestation id,
// read it straight from AttestationRegistry on Monad testnet, and get a
// sealed evidence receipt (never plaintext — amounts stay committed).
// Kills the old self-redirect loop; this page IS the explorer.

import { useState } from "react";
import { getPublicClient, contracts } from "@/lib/contracts";
import { EVENT_TYPES } from "@shared/types";
import { ADDRESSES, MONAD_TESTNET_EXPLORER } from "@shared/constants";

const STATUS_LABELS = ["ACTIVE", "CHALLENGED", "SLASHED", "DISPUTED_BY_SUBJECT"] as const;
const STATUS_BADGE = ["badge-active", "badge-challenged", "badge-slashed", "badge-disputed"] as const;

interface Found {
  id: bigint;
  attester: string;
  subjectPseudonym: string;
  eventType: number;
  commitmentHash: string;
  evidenceHash: string;
  timestamp: bigint;
  status: number;
}

function short(hex: string) {
  return hex.length > 14 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("0");
  const [found, setFound] = useState<Found | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    const id = Number(query);
    if (!Number.isInteger(id) || id < 0) {
      setError("Enter a non-negative attestation id.");
      setFound(null);
      return;
    }
    setLoading(true);
    setError(null);
    setFound(null);
    try {
      const client = getPublicClient();
      const total = (await client.readContract({
        ...contracts.attestationRegistry,
        functionName: "nextAttestationId",
      })) as bigint;
      if (BigInt(id) >= total) {
        setError(`Attestation ${id} does not exist yet — ${total} written so far.`);
        return;
      }
      const a = (await client.readContract({
        ...contracts.attestationRegistry,
        functionName: "getAttestation",
        args: [BigInt(id)],
      })) as unknown as Found;
      setFound(a);
    } catch {
      setError("Lookup failed — the Monad RPC may be unreachable. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const status = found ? STATUS_LABELS[found.status] ?? "UNKNOWN" : null;

  return (
    <div className="page-container fade-in" style={{ paddingTop: "3rem", paddingBottom: "4rem", maxWidth: 720 }}>
      <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>Public explorer</p>
      <h1 className="serif" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 400 }}>
        Look up any attestation.
      </h1>
      <p style={{ color: "var(--vc-text-secondary)", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.65 }}>
        Read straight from the on-chain registry. You will see the sealed commitment —
        never the amount. Amounts are revealed only under the subject's consent.
      </p>

      <form onSubmit={lookup} style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem" }}>
        <input
          className="input-field mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Attestation id, e.g. 0"
          inputMode="numeric"
          aria-label="Attestation id"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Reading chain…" : "Look up"}
        </button>
      </form>

      {loading && (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div className="skeleton" style={{ height: 22, width: "45%" }} />
          <div className="skeleton" style={{ height: 120, width: "100%" }} />
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: "1.5rem", borderColor: "var(--vc-danger)", background: "var(--vc-danger-dim)" }}>
          <p style={{ fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {found && status && (
        <div className="receipt stamp-in" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>
              ATTESTATION #{found.id.toString()}
            </span>
            <span className={`badge ${STATUS_BADGE[found.status] ?? "badge-disputed"}`}>{status}</span>
          </div>
          <p className="serif" style={{ fontSize: "1.4rem" }}>
            {EVENT_TYPES[found.eventType] ?? `Event ${found.eventType}`} · sealed
          </p>
          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <span>attester&nbsp;&nbsp;{short(found.attester)}</span>
            <span>subject&nbsp;&nbsp;&nbsp;{short(found.subjectPseudonym)} <span style={{ color: "var(--vc-text-muted)" }}>(pseudonym)</span></span>
            <span>commit&nbsp;&nbsp;&nbsp;&nbsp;{short(found.commitmentHash)}</span>
            <span>evidence&nbsp;&nbsp;{short(found.evidenceHash)}</span>
            <span>written&nbsp;&nbsp;&nbsp;&nbsp;{new Date(Number(found.timestamp) * 1000).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <a
              className="btn btn-outline btn-sm"
              href={`${MONAD_TESTNET_EXPLORER}/address/${ADDRESSES.attestationRegistry}#events`}
              target="_blank"
              rel="noreferrer"
            >
              View registry on MonadScan ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
