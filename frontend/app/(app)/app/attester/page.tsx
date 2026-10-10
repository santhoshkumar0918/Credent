"use client";

// Attester dashboard — for the wallet that IS the bonded attester.
// Status reads live from AttesterRegistry; the log form hashes a real
// commitment in-browser (canonical shared hasher, fresh salt every time)
// and writes attest() for real. History is a chain scan of YOUR writes.
// Amounts use 2-decimal minor units everywhere (lender re-verification
// must use the same — recorded in ANCHOR). Nothing here is plaintext
// on-chain; the receipt hands you the preimage to pass to the subject.

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { keccak256, toHex, type Address, type Hex } from "viem";
import { hashCommitment, parseAmount, pseudonymFor } from "@shared/commitments";
import { EVENT_TYPES, OUTCOME_CODES, outcomeToOnTime, type EventType } from "@shared/types";
import { useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import {
  ATTESTER_TYPES,
  MIN_BOND_MON,
  readAttester,
  registerAttester,
  topUpBond,
  writeAttestation,
  listMyAttestations,
  newSalt,
  eventLabel,
  eventIndex,
  attesterTxUrl,
  fmtBond,
  type AttesterState,
  type AttesterHistoryRow,
} from "@/lib/attester";

const OUTCOMES = [
  { value: "ON_TIME", label: "✓ On time" },
  { value: "LATE", label: "⚠ Late" },
  { value: "MISSED", label: "✗ Missed" },
  { value: "DEFAULTED", label: "✗ Defaulted" },
] as const;

type OutcomeKey = keyof typeof OUTCOME_CODES;
type Tab = "log" | "history" | "bond";

function isAddress(v: string): v is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(v.trim());
}

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

const STATUS_LABELS = ["ACTIVE", "CHALLENGED", "SLASHED", "DISPUTED"] as const;

export default function AttesterPage() {
  const { wallet, address } = useEmbeddedWallet();
  const [state, setState] = useState<AttesterState | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("log");

  // Log form
  const [subject, setSubject] = useState("");
  const [eventType, setEventType] = useState<EventType>("GIG_PAYOUT");
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState<OutcomeKey>("ON_TIME");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{
    txHash: string; attestationId: bigint | null;
    pseudonym: Hex; commitment: Hex; salt: Hex; timestamp: bigint;
    amount: string; eventType: EventType;
  } | null>(null);

  // History
  const [history, setHistory] = useState<AttesterHistoryRow[] | null>(null);

  // Bond
  const [topUp, setTopUp] = useState("0.5");
  const [regType, setRegType] = useState(0);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setState(await readAttester(address));
    } catch {
      setState(null);
    }
    try {
      setHistory(await listMyAttestations(address));
    } catch {
      setHistory([]);
    }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const subjectOk = isAddress(subject);
  const derived = subjectOk && address ? pseudonymFor(subject.trim() as Hex, address) : null;

  async function withClient<T>(fn: (wc: Awaited<ReturnType<typeof getEmbeddedWalletClient>>) => Promise<T>) {
    if (!wallet) throw new Error("Wallet not ready.");
    const wc = await getEmbeddedWalletClient(wallet);
    return fn(wc);
  }

  async function handleSubmit() {
    if (!subjectOk || !amount || !address) {
      toast.error("Subject wallet address and amount are required.");
      return;
    }
    let parsed: bigint;
    try {
      parsed = parseAmount(amount, 2);
      if (parsed <= BigInt(0)) throw new Error("bad");
    } catch {
      toast.error("Amount must be a positive number (2-decimal units, e.g. 24000.00).");
      return;
    }
    setSubmitting(true);
    setReceipt(null);
    try {
      const live = await readAttester(address);
      if (!live.registered || !live.active) {
        toast.error("This wallet isn't an active bonded attester — register below first.");
        setTab("bond");
        return;
      }
      const salt = newSalt();
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const pseudonym = derived as Hex;
      const onTime = outcomeToOnTime(outcome);
      const commitment = hashCommitment({
        subjectPseudonym: pseudonym,
        eventType,
        amount: parsed,
        onTime,
        outcomeCode: OUTCOME_CODES[outcome],
        timestamp,
        salt,
      });
      const evidence: Hex = reference.trim()
        ? keccak256(toHex(reference.trim()))
        : ("0x" + "00".repeat(32)) as Hex;
      const out = await withClient((wc) =>
        writeAttestation(wc, { pseudonym, eventType: eventIndex(eventType), commitment, evidence }),
      );
      setReceipt({
        txHash: out.txHash, attestationId: out.attestationId,
        pseudonym, commitment, salt, timestamp, amount, eventType,
      });
      toast.success(
        out.attestationId !== null
          ? `Attestation #${out.attestationId} written — commitment only, no plaintext.`
          : "Attestation written — receipt confirmed.",
      );
      setSubject("");
      setAmount("");
      setReference("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Write failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet — nothing was submitted." : msg.slice(0, 180));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    setActing(true);
    try {
      const tx = await withClient((wc) => registerAttester(wc, regType));
      toast.success(`Registered with ${MIN_BOND_MON} MON bond. Tx ${short(tx)}`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet." : msg.slice(0, 160));
    } finally {
      setActing(false);
    }
  }

  async function handleTopUp() {
    setActing(true);
    try {
      const tx = await withClient((wc) => topUpBond(wc, topUp));
      toast.success(`Bond topped up by ${topUp} MON. Tx ${short(tx)}`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Top-up failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet." : msg.slice(0, 160));
    } finally {
      setActing(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Copy failed — select manually."),
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Attester · Dashboard</p>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Attester dashboard</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              Sign what you witnessed. Your bond backs every word.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {state === undefined ? (
              <><div className="skeleton" style={{ width: 92, height: 56 }} /><div className="skeleton" style={{ width: 92, height: 56 }} /></>
            ) : state === null || !state.registered ? (
              <div className="card stat-card" style={{ padding: "0.75rem 1rem" }}>
                <div className="stat-value" style={{ fontSize: "1.1rem" }}>Unregistered</div>
                <div className="stat-label">This wallet</div>
              </div>
            ) : (
              <>
                <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
                  <div className="stat-value" style={{ fontSize: "1.25rem", color: "var(--vc-violet)" }}>{fmtBond(state.bond)} MON</div>
                  <div className="stat-label">Bond</div>
                </div>
                <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
                  <div className="stat-value" style={{ fontSize: "1.25rem", color: Number(state.reputation) < 0 ? "var(--vc-danger)" : "var(--vc-success)" }}>
                    {state.reputation.toString()}
                  </div>
                  <div className="stat-label">Reputation</div>
                </div>
                <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
                  <div className="stat-value" style={{ fontSize: "1.25rem" }}>{state.attestationCount.toString()}</div>
                  <div className="stat-label">Written</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {state !== undefined && state !== null && !state.registered && (
          <div className="card" style={{ marginBottom: "1.25rem", borderColor: "var(--vc-warning)", background: "var(--vc-warning-dim)" }}>
            <p style={{ fontSize: "0.9rem" }}>
              <strong>This wallet isn't a bonded attester.</strong> Writes from it revert on-chain.
              Register below (tab Bond) with a {MIN_BOND_MON} MON bond — or switch to a wallet that's already bonded.
            </p>
          </div>
        )}

        <div className="tabs">
          {(["log", "history", "bond"] as Tab[]).map((t) => (
            <div key={t} className={`tab-item${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t === "log" ? "Log payment" : t === "history" ? "My writes" : "Bond & reputation"}
            </div>
          ))}
        </div>

        {tab === "log" && (
          <div style={{ display: "grid", gap: "1.5rem", maxWidth: 640 }}>
            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: "1.25rem" }}>Log a payment you witnessed</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label" htmlFor="attester-subject-input">Subject wallet address</label>
                  <input id="attester-subject-input" className="input-field mono" placeholder="0x… the worker you paid"
                    value={subject} onChange={(e) => setSubject(e.target.value)} style={{ fontSize: "0.82rem" }} />
                  {subject && !subjectOk && (
                    <p style={{ fontSize: "0.78rem", color: "var(--vc-danger)", marginTop: "0.35rem" }}>0x + 40 hex chars.</p>
                  )}
                  {derived && (
                    <p className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginTop: "0.4rem" }}>
                      pseudonym {short(derived)} <span>(derived — never the raw address on-chain)</span>
                    </p>
                  )}
                </div>
                <div className="grid-2">
                  <div>
                    <label className="input-label" htmlFor="attester-event-type">Event type</label>
                    <select id="attester-event-type" className="input-field" value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}>
                      {EVENT_TYPES.map((t) => <option key={t} value={t}>{eventLabel(EVENT_TYPES.indexOf(t))}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label" htmlFor="attester-amount-input">Amount (2-decimal units)</label>
                    <input id="attester-amount-input" className="input-field" placeholder="e.g. 24000.00"
                      value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Outcome you observed</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {OUTCOMES.map((o) => (
                      <button key={o.value} id={`outcome-${o.value}`} onClick={() => setOutcome(o.value as OutcomeKey)}
                        style={{
                          padding: "0.4rem 0.85rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
                          fontSize: "0.8rem", fontWeight: 600,
                          border: outcome === o.value ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border)",
                          background: outcome === o.value ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                          color: outcome === o.value ? "var(--vc-violet-dim)" : "var(--vc-text-muted)",
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label" htmlFor="attester-note-input">Reference (off-chain only, never on-chain)</label>
                  <input id="attester-note-input" className="input-field" placeholder="e.g. payout batch #12345"
                    value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div style={{
                  padding: "0.6rem 0.85rem", background: "var(--vc-success-dim)",
                  border: "1px solid rgba(14,107,62,0.25)", borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem", color: "var(--vc-text-secondary)",
                }}>
                  Amount + outcome + fresh salt are hashed into a commitment — <strong>never stored as plaintext</strong>.
                  You pay gas for the write.
                </div>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="attester-submit-btn">
                  {submitting ? "Writing commitment…" : "Write attestation"}
                </button>
              </div>
            </div>

            {receipt && (
              <div className="receipt stamp-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <span className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-muted)" }}>
                    ATTESTATION {receipt.attestationId !== null ? `#${receipt.attestationId.toString()}` : "WRITTEN"}
                  </span>
                  <span className="seal">SEALED</span>
                </div>
                <p className="serif" style={{ fontSize: "1.25rem", marginBottom: "0.6rem" }}>
                  {eventLabel(eventIndex(receipt.eventType))} · {receipt.amount} · {outcomeToOnTime(outcome) ? "on time" : "not on time"}
                </p>
                <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span>commit&nbsp;&nbsp;{short(receipt.commitment)}</span>
                  <span>tx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{short(receipt.txHash)}</span>
                </div>
                <div style={{ marginTop: "0.9rem", padding: "0.8rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Disclosure preimage — pass this to the subject off-chain
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginBottom: "0.6rem" }}>
                    Without it, nobody (not even the subject) can ever reveal these values — that's the point, and the responsibility.
                  </p>
                  <div className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-secondary)", display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.6rem" }}>
                    <span>amount {receipt.amount} (2dp) · onTime {String(outcomeToOnTime(outcome))}</span>
                    <span>timestamp {receipt.timestamp.toString()} · salt {short(receipt.salt)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => copy(
                      JSON.stringify({ attestationId: receipt.attestationId?.toString(), subjectPseudonym: receipt.pseudonym, eventType: receipt.eventType, amount: receipt.amount, decimals: 2, onTime: outcomeToOnTime(outcome), timestamp: receipt.timestamp.toString(), salt: receipt.salt, commitment: receipt.commitment }, null, 2),
                      "Preimage",
                    )}>
                      Copy preimage JSON
                    </button>
                    <a className="btn btn-ghost btn-sm" href={attesterTxUrl(receipt.txHash)} target="_blank" rel="noreferrer">
                      View tx on MonadScan ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="card" style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Writes from this wallet</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1.25rem" }}>
              Read straight from the registry, newest first — sealed rows only.
            </p>
            {history === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div className="skeleton" style={{ height: 56 }} />
                <div className="skeleton" style={{ height: 56 }} />
              </div>
            ) : history.length === 0 ? (
              <p style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem", padding: "1rem 0", textAlign: "center" }}>
                No writes from this wallet yet — log your first payment above.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {history.map((h) => (
                  <div key={h.id.toString()} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                    padding: "0.7rem 0.9rem", background: "var(--vc-surface-2)",
                    borderRadius: "var(--radius-md)", border: "1px solid var(--vc-border)", flexWrap: "wrap",
                  }}>
                    <div>
                      <strong style={{ fontSize: "0.88rem" }}>#{h.id.toString()} · {eventLabel(h.eventType)}</strong>
                      <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>
                        {short(h.commitmentHash)} · {new Date(Number(h.timestamp) * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span className={`badge ${h.status === 0 ? "badge-active" : h.status === 2 ? "badge-slashed" : "badge-challenged"}`}>
                        {STATUS_LABELS[h.status] ?? h.status}
                      </span>
                      <a className="btn btn-ghost btn-sm" href={`/explorer?id=${h.id.toString()}`}>Open ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "bond" && (
          <div style={{ display: "grid", gap: "1.25rem", maxWidth: 720 }}>
            {state === undefined ? (
              <div className="skeleton" style={{ height: 180 }} />
            ) : state === null || !state.registered ? (
              <div className="card">
                <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Become a bonded attester</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.65 }}>
                  Registration locks a {MIN_BOND_MON} MON bond. A successful challenge against your
                  attestations slashes from it — that's what makes your signature worth trusting.
                </p>
                <label className="input-label" htmlFor="reg-type">Attester type</label>
                <select id="reg-type" className="input-field" value={regType} onChange={(e) => setRegType(Number(e.target.value))} style={{ marginBottom: "1rem" }}>
                  {ATTESTER_TYPES.map((t, i) => <option key={t} value={i}>{t}</option>)}
                </select>
                <button className="btn btn-primary" disabled={acting} onClick={handleRegister} id="register-attester-btn">
                  {acting ? "Confirm in wallet…" : `Register · lock ${MIN_BOND_MON} MON`}
                </button>
              </div>
            ) : (
              <>
                <div className="card">
                  <h2 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>Bond status</h2>
                  <div className="stat-value" style={{ fontSize: "2rem", color: "var(--vc-violet)" }}>{fmtBond(state.bond)} MON</div>
                  <div className="progress-track" style={{ margin: "0.75rem 0" }}>
                    <div className="progress-fill progress-fill-success"
                      style={{ width: `${Math.min(100, Number((state.bond * BigInt(100)) / BigInt(5e18)))}%` }} />
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--vc-text-secondary)", marginBottom: "1rem" }}>
                    Minimum {MIN_BOND_MON} MON · {state.active ? "active — your writes are accepted" : "INACTIVE — top up to reactivate"}. A lost challenge slashes 0.5 MON to the challenger.
                  </p>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                    <input className="input-field mono" value={topUp} onChange={(e) => setTopUp(e.target.value)}
                      inputMode="decimal" style={{ width: 110 }} aria-label="Top-up amount in MON" />
                    <button className="btn btn-secondary btn-sm" disabled={acting} onClick={handleTopUp} id="top-up-bond-btn">
                      {acting ? "Confirm…" : "Top up bond"}
                    </button>
                  </div>
                </div>
                <div className="card">
                  <h2 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>Reputation</h2>
                  <div className="stat-value" style={{ fontSize: "2rem", color: Number(state.reputation) < 0 ? "var(--vc-danger)" : "var(--vc-success)" }}>
                    {state.reputation.toString()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                      <span>Attestations written</span><strong>{state.attestationCount.toString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                      <span>Challenges lost</span>
                      <strong style={{ color: state.challengesLost > BigInt(0) ? "var(--vc-danger)" : "inherit" }}>
                        {state.challengesLost.toString()}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                      <span>Type</span><strong>{ATTESTER_TYPES[state.attesterType] ?? state.attesterType}</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
