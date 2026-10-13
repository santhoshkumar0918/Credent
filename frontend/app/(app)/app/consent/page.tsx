"use client";

// Grant consent — the subject's signature is the product. Flow:
// pick viewer → pick scopes → pick expiry → sign EIP-712 (old deployed
// struct, see lib/consent.ts) → relay (gasless) or direct write → receipt.
// No disclosure plaintext is invented here: amounts live with the
// attester platform, which posts envelopes after this grant lands.

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { pseudonymFor } from "@shared/commitments";
import { useSignTypedData, useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import { apiFetch } from "@/lib/api-client";
import {
  consentDomain,
  grantTypes,
  grantMessage,
  submitGrant,
  explorerTxUrl,
  saveGrant,
  loadGrants,
  hasLiveGrant,
  type GrantInput,
  type SavedGrant,
} from "@/lib/consent";
import type { Hex, Address } from "viem";

const DEMO_LENDER = {
  address: "0xC3e95328adaB4C416664D1520DDceDc337E847f6",
  name: "Credent demo lender console",
  note: "Operated by the demo team · doubles as fraud-watch challenger",
};

const EVENT_TYPES = [
  { tag: "GIG_PAYOUT", label: "Gig payouts" },
  { tag: "RENT", label: "Rent payments" },
  { tag: "BNPL_INSTALLMENT", label: "BNPL installments" },
  { tag: "P2P_LOAN_REPAYMENT", label: "P2P loan repayments" },
  { tag: "UTILITY_BILL", label: "Utility bills" },
];

const EXPIRY_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const PLATFORM_ATTESTER = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as Address;

type Step = 1 | 2 | 3 | 4;
type TxState = "idle" | "signing" | "submitting" | "done";

function isAddress(v: string): v is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(v);
}

export default function ConsentPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedLender, setSelectedLender] = useState<string>(DEMO_LENDER.address);
  const [customLender, setCustomLender] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["GIG_PAYOUT"]);
  const [expiry, setExpiry] = useState(7);
  const [tx, setTx] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txPath, setTxPath] = useState<"relayer" | "direct" | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [pastGrants, setPastGrants] = useState<(SavedGrant & { live: boolean | null })[]>([]);

  const { wallet, address } = useEmbeddedWallet();
  const { sign } = useSignTypedData();

  const viewer: Address | null = isAddress(customLender.trim())
    ? (customLender.trim() as Address)
    : isAddress(selectedLender)
      ? (selectedLender as Address)
      : null;
  const viewerLabel = isAddress(customLender.trim())
    ? "Custom viewer"
    : selectedLender === DEMO_LENDER.address
      ? DEMO_LENDER.name
      : "Viewer";

  // A borrower's record can be attested under the platform OR under their own
  // bonded attester wallet (solo-testing). Discover which key actually holds
  // attestations and use that pair for the grant — a grant for the wrong
  // attester is useless to the lender.
  const [activeAttester, setActiveAttester] = useState<Address>(PLATFORM_ATTESTER);
  // Past grants made in this browser, each re-checked live. The receipt card
  // above is ephemeral (it clears when you leave); this list is the durable
  // record — same pattern as the Activity feed.
  const refreshPastGrants = useCallback(async () => {
    if (!address) { setPastGrants([]); return; }
    const pairs = [pseudonymFor(address, PLATFORM_ATTESTER), pseudonymFor(address, address)];
    const saved = loadGrants();
    const checked = await Promise.all(
      saved.map(async (g) => {
        try {
          const states = await Promise.all(
            pairs.map((p) => hasLiveGrant(p, g.viewer as Address).catch(() => null as boolean | null)),
          );
          if (states.includes(true)) return { ...g, live: true as boolean | null };
          if (states.includes(false)) return { ...g, live: false as boolean | null };
          return { ...g, live: null as boolean | null };
        } catch {
          return { ...g, live: null as boolean | null };
        }
      }),
    );
    setPastGrants(checked);
  }, [address]);

  useEffect(() => { refreshPastGrants(); }, [refreshPastGrants]);

  const subjectPseudonym = address ? pseudonymFor(address, activeAttester) : null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      const candidates: Address[] = [PLATFORM_ATTESTER, address];
      for (const attester of candidates) {
        try {
          const p = pseudonymFor(address, attester);
          const res = await apiFetch<{ attestations: { id: number }[] }>(
            `/api/subjects/${p}/attestations`,
          );
          if (cancelled) return;
          if ((res.attestations?.length ?? 0) > 0) { setActiveAttester(attester); return; }
        } catch { /* try next candidate */ }
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  function toggleType(tag: string) {
    setSelectedTypes((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSign() {
    if (!address || !wallet || !viewer || !subjectPseudonym) return;
    setTx("signing");
    setTxError(null);
    try {
      const expiryTs = BigInt(Math.floor(Date.now() / 1000) + expiry * 86400);
      const input: GrantInput = {
        subjectPseudonym,
        viewer,
        attester: activeAttester,
        eventTypes: selectedTypes.length > 0 ? selectedTypes : ["GIG_PAYOUT"],
        expiry: expiryTs,
      };
      const signature = await sign(
        { ...consentDomain() } as unknown as Record<string, unknown>,
        grantTypes as unknown as Record<string, unknown>,
        grantMessage(input) as unknown as Record<string, unknown>,
        "ConsentGrant",
      );
      setTx("submitting");
      let walletClient = undefined;
      try {
        walletClient = await getEmbeddedWalletClient(wallet);
      } catch {
        walletClient = undefined; // relayer-only attempt; submitGrant throws honestly if it fails
      }
      const out = await submitGrant(input, signature, walletClient);
      setTxHash(out.txHash);
      setTxPath(out.path);
      saveGrant({
        viewer,
        viewerLabel,
        eventTypes: input.eventTypes,
        expiry: Number(expiryTs),
        txHash: out.txHash,
        at: Date.now(),
      });
      setTx("done");
      refreshPastGrants();
      toast.success(
        out.path === "relayer"
          ? "Consent granted — relayer sponsored, no gas paid."
          : "Consent granted — submitted directly (relayer offline, you paid gas).",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signing failed.";
      const friendly = /rejected|denied/i.test(msg)
        ? "Signature rejected in wallet — nothing was submitted."
        : `Grant failed: ${msg.slice(0, 140)}`;
      setTxError(friendly);
      setTx("idle");
      toast.error(friendly);
    }
  }

  function reset() {
    setStep(1);
    setSelectedLender(DEMO_LENDER.address);
    setCustomLender("");
    setSelectedTypes(["GIG_PAYOUT"]);
    setExpiry(7);
    setTx("idle");
    setTxHash(null);
    setTxPath(null);
    setTxError(null);
  }

  if (tx === "done" && txHash) {
    return (
      <div className="fade-in page-shell">
        <div className="page-header">
          <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Sharing · Consent</p>
          <h1 style={{ fontSize: "1.8rem" }}>Consent granted</h1>
        </div>
        <div className="page-body">
          <div className="receipt stamp-in" style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>CONSENT GRANT · SEALED</span>
              <span className="seal">SIGNED</span>
            </div>
            <p className="serif" style={{ fontSize: "1.35rem" }}>
              {viewerLabel} can see your {selectedTypes.map((t) => EVENT_TYPES.find((e) => e.tag === t)?.label).join(", ").toLowerCase()}
            </p>
            <p className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", marginTop: "0.6rem" }}>
              viewer&nbsp;&nbsp;{viewer?.slice(0, 10)}…{viewer?.slice(-6)} · expires in {expiry} {expiry === 1 ? "day" : "days"}
            </p>
            <p className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", marginTop: "0.25rem" }}>
              tx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{txHash.slice(0, 18)}… · {txPath === "relayer" ? "relayer-sponsored" : "direct write"}
            </p>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.1rem", flexWrap: "wrap" }}>
              <a className="btn btn-outline btn-sm" href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
                View grant on MonadScan ↗
              </a>
              <button className="btn btn-secondary btn-sm" onClick={reset} id="grant-another-btn">Grant another</button>
              <a href="/app/record" className="btn btn-ghost btn-sm">Back to My Record</a>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "1rem" }}>
              Revoke anytime from My Record — revocation stops new disclosures immediately.
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "0.5rem" }}>
              Nothing to copy here: this grant only opens the door. The disclosure values (salt,
              commitment) come from the <strong>attestation receipt</strong>, not from this grant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Sharing · Consent</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Grant consent</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          You decide who sees your record, what they see, and for how long.
        </p>
      </div>

      <div className="page-body">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {(["Choose viewer", "Select data", "Set expiry", "Sign & submit"] as const).map((label, i) => {
            const stepNum = (i + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  background: isDone ? "var(--vc-success)" : isActive ? "var(--vc-violet)" : "var(--vc-surface-3)",
                  color: isDone || isActive ? "#FFFDF7" : "var(--vc-text-muted)",
                  transition: "all 0.2s",
                }}>
                  {isDone ? "✓" : stepNum}
                </div>
                <span style={{ fontSize: "0.8rem", color: isActive ? "var(--vc-text-primary)" : "var(--vc-text-muted)", display: i === 3 ? "block" : "none" }}>
                  {label}
                </span>
                {i < 3 && <div className="divider" style={{ flex: 1, height: 1, margin: 0 }} />}
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth: 560 }}>
          {step === 1 && (
            <div className="card fade-in">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "1.25rem" }}>Step 1 — Choose a viewer</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  onClick={() => { setSelectedLender(DEMO_LENDER.address); setCustomLender(""); }}
                  id={`lender-pick-${DEMO_LENDER.address}`}
                  style={{
                    padding: "1rem", borderRadius: "var(--radius-md)", textAlign: "left", cursor: "pointer",
                    border: selectedLender === DEMO_LENDER.address && !customLender ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border-strong)",
                    background: selectedLender === DEMO_LENDER.address && !customLender ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{DEMO_LENDER.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginBottom: "0.3rem" }}>{DEMO_LENDER.note}</div>
                  <code className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>{DEMO_LENDER.address}</code>
                </button>
                <div>
                  <label className="input-label" htmlFor="custom-viewer">Or paste any viewer address</label>
                  <input
                    id="custom-viewer"
                    className="input-field mono"
                    placeholder="0x…"
                    value={customLender}
                    onChange={(e) => setCustomLender(e.target.value)}
                    style={{ fontSize: "0.8rem" }}
                  />
                  {customLender && !isAddress(customLender.trim()) && (
                    <p style={{ fontSize: "0.78rem", color: "var(--vc-danger)", marginTop: "0.35rem" }}>
                      That doesn't look like an address (0x + 40 hex chars).
                    </p>
                  )}
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: "1.5rem" }} disabled={!viewer} onClick={() => setStep(2)} id="consent-next-1">
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="card fade-in">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Step 2 — What can they see?</h2>
              <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Only the categories you tick. Nothing else — the chain holds commitments, not amounts.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {EVENT_TYPES.map((et) => {
                  const checked = selectedTypes.includes(et.tag);
                  return (
                    <label key={et.tag} style={{
                      display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)", cursor: "pointer",
                      border: checked ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border)",
                      background: checked ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleType(et.tag)}
                        style={{ accentColor: "var(--vc-violet)", width: 16, height: 16 }} id={`type-${et.tag}`} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{et.label}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" disabled={selectedTypes.length === 0} onClick={() => setStep(3)} id="consent-next-2">
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card fade-in">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Step 3 — How long?</h2>
              <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Access expires automatically. You can also revoke early.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {EXPIRY_OPTIONS.map((opt) => (
                  <button key={opt.value} id={`expiry-${opt.value}`} onClick={() => setExpiry(opt.value)}
                    style={{
                      padding: "0.6rem 1.2rem", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600,
                      border: expiry === opt.value ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border-strong)",
                      background: expiry === opt.value ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                      color: expiry === opt.value ? "var(--vc-violet-dim)" : "var(--vc-text-secondary)",
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)} id="consent-next-3">
                  Review & sign →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card fade-in">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "1.25rem" }}>Step 4 — Review & sign</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Viewer</div>
                  <div style={{ fontWeight: 600 }}>{viewerLabel}</div>
                  <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>{viewer}</div>
                </div>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Data shared</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedTypes.map((t) => EVENT_TYPES.find((e) => e.tag === t)?.label).join(", ")}
                  </div>
                </div>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Expires</div>
                  <div style={{ fontWeight: 600 }}>In {expiry} {expiry === 1 ? "day" : "days"}</div>
                </div>
              </div>
              <div style={{
                padding: "0.75rem 1rem", background: "var(--vc-success-dim)",
                border: "1px solid rgba(14,107,62,0.25)", borderRadius: "var(--radius-md)",
                fontSize: "0.82rem", color: "var(--vc-text-secondary)", marginBottom: "1.5rem",
              }}>
                Your wallet signs an EIP-712 grant. The relayer submits it on-chain — you pay no
                gas. If the relayer is offline you'll be asked to submit directly instead.{" "}
                <span className="badge badge-demo">relayer-sponsored</span>
              </div>
              {txError && (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-danger)", marginBottom: "1rem" }}>{txError}</p>
              )}
              {!address && (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-warning)", marginBottom: "1rem" }}>
                  Wallet still provisioning — signing unlocks when your address appears.
                </p>
              )}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button className="btn btn-primary" disabled={tx !== "idle" || !address || !viewer} onClick={handleSign} id="consent-sign-btn">
                  {tx === "signing" ? "Waiting for signature…" : tx === "submitting" ? "Submitting on-chain…" : "Sign grant"}
                </button>
              </div>
            </div>
          )}
        </div>

        {pastGrants.length > 0 && (
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.05rem" }}>Past grants in this browser</h2>
              <button className="btn btn-ghost btn-sm" onClick={refreshPastGrants}>Re-check live status</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {pastGrants.map((g) => (
                <div key={g.viewer + g.at} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.2rem" }}>
                      Granted {g.viewerLabel} access
                    </div>
                    <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.35rem" }}>
                      {g.viewer.slice(0, 10)}…{g.viewer.slice(-6)} · {g.eventTypes.join(", ")} · {new Date(g.at).toLocaleString()}
                    </div>
                    <a className="mono" style={{ fontSize: "0.72rem" }} href={explorerTxUrl(g.txHash)} target="_blank" rel="noreferrer">
                      {g.txHash.slice(0, 18)}… ↗
                    </a>
                  </div>
                  <span className={`badge ${g.live === true ? "badge-active" : g.live === false ? "badge-slashed" : "badge-challenged"}`}>
                    {g.live === true ? "live on-chain" : g.live === false ? "ended" : "unconfirmed"}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "1rem" }}>
              The receipt card after signing is temporary — this list is the durable record, re-checked against the chain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
