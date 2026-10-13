"use client";

// Lender console — verify first, decide second. Every disclosure is
// recomputed in-browser against the on-chain commitment; the verdict names
// the failed check. onTimeRate is computed lender-side from verified
// disclosures only, and completeness is checked against the full on-chain
// enumeration — a subject who withholds an attestation shows up as a gap.
// Underwriting writes use verified numbers exclusively. The portfolio is
// the demo pool's book, labeled as such — never advice.

import { useState } from "react";
import toast from "react-hot-toast";
import { EVENT_TYPES, type EventType } from "@shared/types";
import { useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import {
  verifyDisclosure,
  fetchEnumeration,
  completeness,
  underwriteInputs,
  writeUnderwriting,
  readPoolBook,
  fetchAttesterRep,
  lenderTxUrl,
  fmtMON,
  type DisclosureInput,
  type Verdict,
  type VerifiedSet,
  type EnumRow,
  type PoolLoan,
  type AttesterRep,
} from "@/lib/lender";
import type { Hex, Address } from "viem";

type Tab = "verify" | "underwrite" | "portfolio";

function isPseudonym(v: string): v is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(v.trim());
}

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

const REASONS: Record<string, string> = {
  NOT_FOUND: "No such attestation",
  SUBJECT_MISMATCH: "Wrong subject",
  EVENT_MISMATCH: "Wrong event type",
  COMMITMENT_MISMATCH: "Values altered",
  BAD_INPUT: "Malformed disclosure",
};

const emptyDisclosure: DisclosureInput = {
  attestationId: "",
  subjectPseudonym: "0x" as Hex,
  eventType: "GIG_PAYOUT",
  amount: "",
  onTime: true,
  timestamp: "",
  salt: "0x" as Hex,
};

export default function LenderPage() {
  const { wallet } = useEmbeddedWallet();
  const [tab, setTab] = useState<Tab>("verify");

  // Verify state
  const [pseudonym, setPseudonym] = useState("");
  const [enumeration, setEnumeration] = useState<EnumRow[] | null | undefined>(undefined);
  const [loadingEnum, setLoadingEnum] = useState(false);
  const [form, setForm] = useState<DisclosureInput>(emptyDisclosure);
  const [preimage, setPreimage] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<VerifiedSet[]>([]);

  // Underwrite state
  const [writing, setWriting] = useState(false);
  const [uwReceipt, setUwReceipt] = useState<{ txHash: string; score: bigint } | null>(null);

  // Portfolio state
  const [book, setBook] = useState<{ loans: PoolLoan[]; balance: bigint } | null | undefined>(undefined);
  const [repAddr, setRepAddr] = useState("");
  const [rep, setRep] = useState<AttesterRep | null | undefined>(undefined);

  const pseudoOk = isPseudonym(pseudonym);
  const comp = completeness(verified, enumeration ?? null);
  const inputs = underwriteInputs(verified);

  async function loadEnumeration() {
    if (!pseudoOk) {
      toast.error("Paste a subject pseudonym first (0x + 64 hex).");
      return;
    }
    setLoadingEnum(true);
    setEnumeration(await fetchEnumeration(pseudonym.trim() as Hex));
    setLoadingEnum(false);
  }

  function fillFromPreimage() {
    try {
      const p = JSON.parse(preimage) as Record<string, string | boolean>;
      setForm({
        attestationId: String(p.attestationId ?? ""),
        subjectPseudonym: String(p.subjectPseudonym ?? "0x") as Hex,
        eventType: (String(p.eventType ?? "GIG_PAYOUT") || "GIG_PAYOUT") as EventType,
        amount: String(p.amount ?? ""),
        onTime: p.onTime !== false,
        timestamp: String(p.timestamp ?? ""),
        salt: String(p.salt ?? "0x") as Hex,
      });
      if (typeof p.subjectPseudonym === "string" && isPseudonym(p.subjectPseudonym)) {
        setPseudonym(p.subjectPseudonym);
      }
      toast.success("Preimage loaded into the form — verify it before trusting it.");
    } catch {
      toast.error("That isn't valid preimage JSON.");
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerdict(null);
    try {
      const v = await verifyDisclosure(form);
      setVerdict(v);
      if (!v.ok) toast.error(`${REASONS[v.reason]} — ${v.detail}`);
    } finally {
      setVerifying(false);
    }
  }

  function addVerified() {
    if (verdict && verdict.ok) {
      if (verified.some((x) => x.id === verdict.id)) {
        toast.error("Already in the verified set.");
        return;
      }
      setVerified((prev) => [...prev, {
        id: verdict.id, attester: verdict.attester, status: verdict.status,
        onTime: form.onTime, timestamp: BigInt(form.timestamp),
      }]);
      setVerdict(null);
      setForm(emptyDisclosure);
      toast.success(`Attestation #${verdict.id} added to the verified set.`);
    }
  }

  async function handleUnderwrite() {
    if (!pseudoOk || verified.length === 0) {
      toast.error("Verify at least one disclosure first — underwriting never uses self-claims.");
      return;
    }
    if (!wallet) {
      toast.error("Wallet not ready.");
      return;
    }
    setWriting(true);
    setUwReceipt(null);
    try {
      const wc = await getEmbeddedWalletClient(wallet);
      const out = await writeUnderwriting(wc, pseudonym.trim() as Hex, inputs);
      setUwReceipt(out);
      toast.success(`Underwriting recorded — pool score ${out.score}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Underwriting failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet." : msg.slice(0, 170));
    } finally {
      setWriting(false);
    }
  }

  async function loadBook() {
    setBook(await readPoolBook());
  }

  async function checkRep() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(repAddr.trim())) {
      toast.error("Enter an attester address.");
      return;
    }
    setRep(undefined);
    setRep(await fetchAttesterRep(repAddr.trim() as Address));
  }

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Lender · Console</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Underwriting console</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Re-verify everything. Trust the math, not the applicant.
        </p>
      </div>

      <div className="page-body">
        <div className="tabs">
          {(["verify", "underwrite", "portfolio"] as Tab[]).map((t) => (
            <div key={t} className={`tab-item${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t === "verify" ? "1 · Verify" : t === "underwrite" ? "2 · Underwrite" : "3 · Pool book"}
            </div>
          ))}
        </div>

        {tab === "verify" && (
          <div className="verify-layout">
            <div style={{ display: "grid", gap: "1.25rem", maxWidth: 680, minWidth: 0 }}>
            {/* Subject + enumeration */}
            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Whose record?</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
                The subject hands you their pseudonym with the grant — never their wallet address.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <input className="input-field mono" placeholder="0x… (64 hex)" value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)} style={{ flex: 1, minWidth: 220, fontSize: "0.8rem" }} />
                <button className="btn btn-secondary btn-sm" onClick={loadEnumeration} disabled={loadingEnum || !pseudoOk}>
                  {loadingEnum ? "Loading…" : "Load enumeration"}
                </button>
              </div>
              {enumeration !== undefined && (
                <p style={{ fontSize: "0.82rem", marginTop: "0.75rem", color: enumeration === null ? "var(--vc-warning)" : "var(--vc-text-secondary)" }}>
                  {enumeration === null
                    ? "Enumeration unavailable (API offline) — completeness can't be checked. Demand it before deciding."
                    : `${enumeration.length} attestation${enumeration.length === 1 ? "" : "s"} on record: ids ${enumeration.map((e) => e.id).join(", ") || "—"}. Disclosures must cover every one.`}
                </p>
              )}
            </div>

            {/* Disclosure form */}
            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Check a disclosure</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
                Paste the values the subject disclosed — or load an attester preimage below. The hash is recomputed here.
              </p>
              <div className="grid-2" style={{ marginBottom: "0.8rem" }}>
                <div>
                  <label className="input-label">Attestation id</label>
                  <input className="input-field mono" value={form.attestationId}
                    onChange={(e) => setForm({ ...form, attestationId: e.target.value })} placeholder="e.g. 2" />
                </div>
                <div>
                  <label className="input-label">Event type</label>
                  <select className="input-field" value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value as EventType })}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (2-decimal units)</label>
                  <input className="input-field" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="24000.00" inputMode="decimal" />
                </div>
                <div>
                  <label className="input-label">Timestamp (unix sec)</label>
                  <input className="input-field mono" value={form.timestamp}
                    onChange={(e) => setForm({ ...form, timestamp: e.target.value })} placeholder="e.g. 1760000000" />
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: "0.8rem" }}>
                <div>
                  <label className="input-label">Subject pseudonym</label>
                  <input className="input-field mono" value={form.subjectPseudonym}
                    onChange={(e) => setForm({ ...form, subjectPseudonym: e.target.value as Hex })}
                    style={{ fontSize: "0.75rem" }} placeholder="0x… (64 hex)" />
                </div>
                <div>
                  <label className="input-label">Salt</label>
                  <input className="input-field mono" value={form.salt}
                    onChange={(e) => setForm({ ...form, salt: e.target.value as Hex })}
                    style={{ fontSize: "0.75rem" }} placeholder="0x… (64 hex)" />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", marginBottom: "1rem", cursor: "pointer" }}>
                <input type="checkbox" checked={form.onTime} onChange={(e) => setForm({ ...form, onTime: e.target.checked })}
                  style={{ accentColor: "var(--vc-violet)", width: 16, height: 16 }} />
                Paid on time
              </label>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm" onClick={handleVerify} disabled={verifying} id="verify-disclosure-btn">
                  {verifying ? "Recomputing…" : "Verify against chain"}
                </button>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label className="input-label">…or paste the disclosure preimage JSON — from the attester receipt (“Copy preimage JSON”), not from a consent grant</label>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <input className="input-field mono" value={preimage} onChange={(e) => setPreimage(e.target.value)}
                    placeholder='{"attestationId": "2", …}' style={{ flex: 1, minWidth: 220, fontSize: "0.75rem" }} />
                  <button className="btn btn-outline btn-sm" onClick={fillFromPreimage}>Load</button>
                </div>
              </div>

              {verdict && (
                <div className={`receipt ${verdict.ok ? "" : ""}`} style={{
                  marginTop: "1.1rem",
                  borderColor: verdict.ok ? "rgba(14,107,62,0.4)" : "var(--vc-danger)",
                  background: verdict.ok ? "var(--vc-success-dim)" : "var(--vc-danger-dim)",
                }}>
                  {verdict.ok ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <strong>✓ Verified — attestation #{verdict.id.toString()}</strong>
                        <span className={`badge ${verdict.status === 0 ? "badge-active" : verdict.status === 2 ? "badge-slashed" : "badge-challenged"}`}>
                          {["active", "challenged", "slashed", "disputed"][verdict.status] ?? "unknown"}
                        </span>
                      </div>
                      <p className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", marginBottom: "0.7rem" }}>
                        attester {short(verdict.attester)} · recomputed hash equals on-chain commitment
                      </p>
                      {verdict.status !== 0 && (
                        <p style={{ fontSize: "0.82rem", color: "var(--vc-warning)", marginBottom: "0.7rem" }}>
                          Values check out, but this attestation is {["", "challenged", "slashed", "disputed"][verdict.status]} — price that in.
                        </p>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={addVerified}>Add to verified set →</button>
                    </div>
                  ) : (
                    <div>
                      <strong>✗ {REASONS[verdict.reason]}</strong>
                      <p style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>{verdict.detail}</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "0.4rem" }}>
                        Rejected — nothing from this disclosure enters the decision.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Verified set + completeness */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h2 style={{ fontSize: "1.05rem" }}>Verified set ({verified.length})</h2>
                {verified.length > 0 && (
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)" }}>
                    on-time {inputs.total === 0 ? 0 : Math.floor((verified.filter((v) => v.onTime).length * 1000) / verified.length) / 10}% lender-side
                  </span>
                )}
              </div>
              {verified.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>
                  Nothing verified yet. Only verified disclosures feed the decision — self-claims never do.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {verified.map((v) => (
                    <div key={v.id.toString()} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.55rem 0.8rem", background: "var(--vc-surface-2)",
                      borderRadius: "var(--radius-md)", fontSize: "0.83rem",
                    }}>
                      <span>#{v.id.toString()} · {v.onTime ? "✓ on time" : "✗ not on time"} · {short(v.attester)}</span>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setVerified((prev) => prev.filter((x) => x.id !== v.id))}>remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{
                padding: "0.7rem 0.9rem", borderRadius: "var(--radius-md)", fontSize: "0.83rem",
                background: comp.state === "complete" ? "var(--vc-success-dim)" : comp.state === "gaps" ? "var(--vc-warning-dim)" : "var(--vc-surface-2)",
                border: "1px solid var(--vc-border)",
              }}>
                {comp.state === "complete" && "✓ Complete — every attested id is disclosed. No hidden history."}
                {comp.state === "gaps" && (
                  <>⚠ Missing ids: <strong className="mono">{comp.missing.join(", ")}</strong> — demand disclosure for each before deciding.</>
                )}
                {comp.state === "unknown" && "Completeness unknown — load the enumeration above before deciding."}
              </div>
            </div>
            </div>
            <aside className="verify-rail card" style={{ padding: "1.25rem" }}>
              <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>How verification works</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "0.83rem", color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>
                <p><strong style={{ color: "var(--vc-text-primary)" }}>1 · Recompute.</strong> Amount, outcome, timestamp and salt are hashed in this browser with the canonical commitment function.</p>
                <p><strong style={{ color: "var(--vc-text-primary)" }}>2 · Compare.</strong> The recomputed hash must equal the on-chain commitment — plus matching subject, event and id.</p>
                <p><strong style={{ color: "var(--vc-text-primary)" }}>3 · Complete.</strong> Verified ids are checked against the full enumeration. Gaps mean hidden history.</p>
                <p><strong style={{ color: "var(--vc-text-primary)" }}>4 · Decide.</strong> Only verified disclosures feed underwriting. Nothing else counts.</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "underwrite" && (
          <div style={{ display: "grid", gap: "1.25rem", maxWidth: 640 }}>
            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Record underwriting on-chain</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
                Numbers below come only from the verified set — {verified.length} disclosure{verified.length === 1 ? "" : "s"}. No verified set, no underwriting.
              </p>
              <div className="vc-table" style={{ marginBottom: "1.25rem" }}>
                <table className="vc-table">
                  <tbody>
                    <tr><td>On-time rate</td><td><strong>{(inputs.onTimeRateBps / 100).toFixed(2)}% ({inputs.onTimeRateBps} bps)</strong></td></tr>
                    <tr><td>Tenure</td><td><strong>{inputs.tenureDays} days</strong></td></tr>
                    <tr><td>Distinct attesters</td><td><strong>{inputs.distinctAttesters}</strong></td></tr>
                    <tr><td>Total attestations</td><td><strong>{inputs.total}</strong></td></tr>
                  </tbody>
                </table>
              </div>
              {uwReceipt && (
                <div className="receipt stamp-in" style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-muted)" }}>UNDERWRITING · RECORDED</span>
                    <span className="seal">SCORE {uwReceipt.score.toString()}</span>
                  </div>
                  <a className="btn btn-outline btn-sm" style={{ marginTop: "0.7rem" }} href={lenderTxUrl(uwReceipt.txHash)} target="_blank" rel="noreferrer">
                    View on MonadScan ↗
                  </a>
                  <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "0.6rem" }}>
                    Score ≥ 50 unlocks origination by the pool operator. The score is recomputable by anyone — that's the feature.
                  </p>
                </div>
              )}
              <button className="btn btn-primary" disabled={writing || verified.length === 0 || !pseudoOk}
                onClick={handleUnderwrite} id="underwrite-btn">
                {writing ? "Writing…" : "Write underwriting to pool"}
              </button>
              {(!pseudoOk || verified.length === 0) && (
                <p style={{ fontSize: "0.8rem", color: "var(--vc-warning)", marginTop: "0.7rem" }}>
                  {!pseudoOk ? "Set the subject pseudonym in the Verify tab first." : "Verify disclosures first — the button stays locked until then."}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div style={{ display: "grid", gap: "1.25rem", maxWidth: 680 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem" }}>Demo pool book</h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>Every loan the pool originated — reads, not advice.</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadBook}>Refresh</button>
              </div>
              {book === undefined ? (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>Press refresh to read the pool.</p>
              ) : book === null ? (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-warning)" }}>Pool unreadable — RPC may be down. Retry.</p>
              ) : (
                <>
                  <p className="mono" style={{ fontSize: "0.8rem", marginBottom: "0.9rem" }}>
                    pool balance {fmtMON(book.balance)} MON · {book.loans.length} loan{book.loans.length === 1 ? "" : "s"}
                  </p>
                  {book.loans.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>No loans originated yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {book.loans.map((l) => (
                        <div key={l.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem",
                          padding: "0.7rem 0.9rem", background: "var(--vc-surface-2)",
                          borderRadius: "var(--radius-md)", fontSize: "0.85rem", flexWrap: "wrap",
                        }}>
                          <span><strong>#{l.id}</strong> · {fmtMON(l.amount)} MON · {short(l.borrower)}</span>
                          <span className={`badge ${l.repaid ? "badge-active" : "badge-challenged"}`}>
                            {l.repaid ? "repaid" : `due ${new Date(Number(l.dueAt) * 1000).toLocaleDateString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Check an attester (indexer mirror)</h2>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                <input className="input-field mono" value={repAddr} onChange={(e) => setRepAddr(e.target.value)}
                  placeholder="0x… attester" style={{ flex: 1, minWidth: 200, fontSize: "0.78rem" }} />
                <button className="btn btn-secondary btn-sm" onClick={checkRep}>Check</button>
              </div>
              {rep === undefined ? (
                <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)" }}>Mirror result appears here — always confirm bond-critical facts on-chain.</p>
              ) : rep === null ? (
                <p style={{ fontSize: "0.85rem", color: "var(--vc-warning)" }}>Unknown attester or indexer offline.</p>
              ) : (
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
                  <span>reputation <strong>{rep.reputation_score}</strong></span>
                  <span>bond <strong>{rep.bond}</strong></span>
                  <span>written <strong>{rep.attestation_count}</strong></span>
                  <span>lost <strong>{rep.challenges_lost}</strong></span>
                  <span className={`badge ${rep.active ? "badge-active" : "badge-slashed"}`}>{rep.active ? "active" : "inactive"}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
