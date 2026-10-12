"use client";

// My Record — the borrower's sealed timeline. Every row comes from the
// live attestations API (chain-mirrored Postgres). Amounts, outcomes and
// tiers are NEVER shown here: the subject holds no disclosure plaintext,
// and inventing them would be fabrication. A row proves an attestation
// EXISTS (event type, attester, status, commitment) — values arrive only
// under consent, on the lender's side. Access grants below are re-checked
// live against ConsentRegistry; revocation signs and submits for real.

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { pseudonymFor } from "@shared/commitments";
import { apiFetch } from "@/lib/api-client";
import { useSignTypedData, useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import {
  consentDomain,
  revokeTypes,
  submitRevoke,
  hasLiveGrant,
  loadGrants,
  dropGrant,
  explorerTxUrl,
  type SavedGrant,
} from "@/lib/consent";
import { MONAD_TESTNET_EXPLORER } from "@shared/constants";
import type { Address, Hex } from "viem";

const PLATFORM_ATTESTER = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as Address;

const EVENT_LABELS: Record<string, string> = {
  GIG_PAYOUT: "Gig payout",
  RENT: "Rent",
  BNPL_INSTALLMENT: "BNPL installment",
  P2P_LOAN_REPAYMENT: "P2P loan repayment",
  UTILITY_BILL: "Utility bill",
};

interface LiveAttestation {
  id: number;
  attester: string;
  event_type: string;
  commitment_hash: string;
  block_timestamp: string | null;
  tx_hash: string | null;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "badge-active",
    CHALLENGED: "badge-challenged",
    SLASHED: "badge-slashed",
    DISPUTED_BY_SUBJECT: "badge-disputed",
  };
  return <span className={`badge ${map[status] ?? "badge-active"}`}>{status}</span>;
}

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

function RevokeModal({ grant, pseudonym, onClose, onRevoked }: {
  grant: SavedGrant & { live: boolean | null };
  pseudonym: Hex;
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [state, setState] = useState<"idle" | "signing" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const { wallet } = useEmbeddedWallet();
  const { sign } = useSignTypedData();

  async function handleRevoke() {
    setState("signing");
    setError(null);
    try {
      const viewer = grant.viewer as Address;
      const signature = await sign(
        { ...consentDomain() } as unknown as Record<string, unknown>,
        revokeTypes as unknown as Record<string, unknown>,
        { subjectPseudonym: pseudonym, viewer } as unknown as Record<string, unknown>,
        "ConsentRevoke",
      );
      setState("submitting");
      let walletClient = undefined;
      try {
        if (wallet) walletClient = await getEmbeddedWalletClient(wallet);
      } catch { walletClient = undefined; }
      const out = await submitRevoke(pseudonym, viewer, signature, walletClient);
      dropGrant(viewer);
      toast.success(
        out.path === "relayer"
          ? "Access revoked — effective immediately."
          : "Access revoked directly (relayer offline, you paid gas).",
      );
      onRevoked();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Revoke failed.";
      setError(/rejected|denied/i.test(msg) ? "Signature rejected — nothing was submitted." : msg.slice(0, 160));
      setState("idle");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Revoke access</h2>
        <p style={{ color: "var(--vc-text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem", lineHeight: 1.65 }}>
          Revoking stops <strong style={{ color: "var(--vc-text-primary)" }}>{grant.viewerLabel}</strong>{" "}
          ({short(grant.viewer)}) from new disclosures immediately. Disclosures already released
          stay valid — revocation can't un-ring that bell.
        </p>
        {error && <p style={{ color: "var(--vc-danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-danger" disabled={state !== "idle"} onClick={handleRevoke} id="revoke-confirm-btn">
            {state === "signing" ? "Waiting for signature…" : state === "submitting" ? "Submitting…" : "Confirm revoke"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function MyRecordPage() {
  const [showHex, setShowHex] = useState<number | null>(null);
  const [attestations, setAttestations] = useState<LiveAttestation[] | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [grants, setGrants] = useState<(SavedGrant & { live: boolean | null })[]>([]);
  const [revoking, setRevoking] = useState<(SavedGrant & { live: boolean | null }) | null>(null);

  const { address } = useEmbeddedWallet();
  // A borrower's record can be attested by the platform OR by any bonded
  // attester they've dealt with — including their own attester wallet when
  // solo-testing. Query both keys so neither case is invisible.
  const pseudonyms = address
    ? [pseudonymFor(address, PLATFORM_ATTESTER), pseudonymFor(address, address)]
    : [];
  const primaryPseudonym = pseudonyms[0] ?? null;

  const refresh = useCallback(async () => {
    if (pseudonyms.length === 0) return;
    try {
      const perKey = await Promise.all(
        pseudonyms.map(async (p) => {
          const res = await apiFetch<{ attestations: LiveAttestation[] }>(`/api/subjects/${p}/attestations`);
          return res.attestations ?? [];
        }),
      );
      const seen = new Set<number>();
      const merged: LiveAttestation[] = [];
      for (const list of perKey) {
        for (const a of list) {
          if (!seen.has(a.id)) { seen.add(a.id); merged.push(a); }
        }
      }
      merged.sort((x, y) => y.id - x.id);
      setAttestations(merged);
      setApiDown(false);
    } catch {
      setAttestations(null);
      setApiDown(true);
    }
    const saved = loadGrants();
    const checked = await Promise.all(
      saved.map(async (g) => {
        try {
          return { ...g, live: primaryPseudonym ? await hasLiveGrant(primaryPseudonym, g.viewer as Address) : null };
        } catch {
          return { ...g, live: null };
        }
      }),
    );
    setGrants(checked);
  }, [pseudonyms.join(","), primaryPseudonym]);

  useEffect(() => { refresh(); }, [refresh]);

  const active = attestations?.filter((a) => a.status === "ACTIVE").length ?? 0;
  const disputed = attestations?.filter((a) => a.status !== "ACTIVE").length ?? 0;

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Borrower · Record</p>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>My Record</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              {attestations === null
                ? "Connecting to your on-chain record…"
                : `${attestations.length} sealed attestations · ${active} active${disputed > 0 ? ` · ${disputed} disputed` : ""}`}
            </p>
          </div>
          <span className="badge badge-demo">interim signed disclosure</span>
        </div>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem" }}>
        {/* Sealed timeline */}
        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Payment history</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1.25rem" }}>
            Sealed by design — amounts and outcomes stay committed on-chain until you grant a viewer access.
          </p>
          {attestations === null ? (
            apiDown ? (
              <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
                <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Record service unreachable.</p>
                <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
                  The API/indexer isn't running — your attestations are safe on-chain, just not listed here right now.
                </p>
                <button className="btn btn-outline btn-sm" onClick={refresh}>Retry</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div className="skeleton" style={{ height: 56 }} />
                <div className="skeleton" style={{ height: 56 }} />
                <div className="skeleton" style={{ height: 56 }} />
              </div>
            )
          ) : attestations.length === 0 ? (
            <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
              <p className="serif" style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>No attestations yet.</p>
              <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>
                When a platform you work with logs a payment, it appears here — sealed, signed, and yours.
              </p>
            </div>
          ) : (
            <div className="timeline stagger">
              {attestations.map((a) => (
                <div key={a.id} className="timeline-item">
                  <div className={`timeline-dot ${a.status === "ACTIVE" ? "timeline-dot-success" : a.status === "SLASHED" ? "timeline-dot-danger" : "timeline-dot-warning"}`}>
                    {a.status === "ACTIVE" ? "✓" : "!"}
                  </div>
                  <div className="timeline-content">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {EVENT_LABELS[a.event_type] ?? a.event_type} <span style={{ color: "var(--vc-text-muted)", fontWeight: 400 }}>· sealed</span>
                      </strong>
                      <StatusBadge status={a.status} />
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
                      attester {short(a.attester)} · {a.block_timestamp ? new Date(a.block_timestamp).toLocaleDateString() : "on-chain"}
                      {a.tx_hash && (
                        <> · <a href={`${MONAD_TESTNET_EXPLORER}/tx/${a.tx_hash}`} target="_blank" rel="noreferrer" style={{ color: "var(--vc-violet)", textDecoration: "underline" }}>tx ↗</a></>
                      )}
                    </div>
                    {showHex === a.id ? (
                      <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "var(--vc-surface-2)", borderRadius: 6 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>
                          commitmentHash (on-chain — not plaintext)
                        </div>
                        <code className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", wordBreak: "break-all" }}>
                          {a.commitment_hash}
                        </code>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "0.5rem" }} onClick={() => setShowHex(null)}>
                          hide
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ marginTop: "0.3rem", padding: "0.1rem 0", fontSize: "0.75rem" }} onClick={() => setShowHex(a.id)}>
                        Show commitment hash →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Access grants — live-checked */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.05rem" }}>Access grants</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
              {grants.filter((g) => g.live).length} live on-chain
            </span>
          </div>
          {grants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ color: "var(--vc-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                No one has access to your record right now.
              </p>
              <a href="/app/consent" className="btn btn-primary btn-sm">Grant consent →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {grants.map((g) => (
                <div key={g.viewer} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.85rem 1rem", background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--vc-border)",
                  flexWrap: "wrap", gap: "0.75rem",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {g.viewerLabel}
                      <span className={`badge ${g.live === true ? "badge-active" : g.live === false ? "badge-slashed" : "badge-challenged"}`}>
                        {g.live === true ? "live" : g.live === false ? "ended" : "unknown"}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                      {short(g.viewer)} · {g.eventTypes.join(", ")} · till {new Date(g.expiry * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setRevoking(g)} id={`revoke-btn-${g.viewer.slice(2, 8)}`}>
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "1rem" }}>
            Grants made on another device still hold on-chain — this list shows grants made in this browser, each re-checked live.
          </p>
        </div>
      </div>

      {revoking && primaryPseudonym && (
        <RevokeModal
          grant={revoking}
          pseudonym={primaryPseudonym}
          onClose={() => setRevoking(null)}
          onRevoked={refresh}
        />
      )}
    </div>
  );
}
