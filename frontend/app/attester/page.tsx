"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const EVENT_TYPES = [
  { value: "GIG_PAYOUT", label: "Gig payout" },
  { value: "RENT", label: "Rent" },
  { value: "BNPL_INSTALLMENT", label: "BNPL installment" },
  { value: "P2P_LOAN_REPAYMENT", label: "P2P loan repayment" },
  { value: "UTILITY_BILL", label: "Utility bill" },
];

const OUTCOMES = [
  { value: "ON_TIME", label: "✓ On time", color: "var(--vc-success)" },
  { value: "LATE", label: "⚠ Late", color: "var(--vc-warning)" },
  { value: "MISSED", label: "✗ Missed", color: "var(--vc-danger)" },
  { value: "DEFAULTED", label: "✗ Defaulted", color: "var(--vc-danger)" },
];

const MOCK_RECENT = [
  { id: "10432", subject: "0x5f2e...b1", event: "Gig payout", amount: "₹24,000", outcome: "ON_TIME", date: "2026-09-28", tier: 2 },
  { id: "10431", subject: "0x5f2e...b1", event: "Gig payout", amount: "₹22,500", outcome: "ON_TIME", date: "2026-08-28", tier: 2 },
  { id: "10430", subject: "0x9a1c...d3", event: "Rent", amount: "₹8,500", outcome: "ON_TIME", date: "2026-07-01", tier: 1 },
];

export default function AttesterPage() {
  const [form, setForm] = useState({
    subject: "",
    eventType: "GIG_PAYOUT",
    amount: "",
    outcome: "ON_TIME",
    proofTier: "2",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"log" | "webhooks" | "status">("log");

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.subject || !form.amount) {
      toast.error("Subject and amount are required");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitting(false);
    toast.success(`Attestation written on-chain — commitment hash only, no plaintext`);
    setForm({ subject: "", eventType: "GIG_PAYOUT", amount: "", outcome: "ON_TIME", proofTier: "2", note: "" });
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Attester dashboard</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              Log payments, monitor your bond and reputation, watch incoming webhooks.
            </p>
          </div>
          {/* Bond + rep status */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
              <div className="stat-value" style={{ fontSize: "1.25rem", color: "var(--vc-violet-light)" }}>50 MON</div>
              <div className="stat-label">Bond</div>
            </div>
            <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
              <div className="stat-value" style={{ fontSize: "1.25rem", color: "var(--vc-success)" }}>94</div>
              <div className="stat-label">Reputation</div>
            </div>
            <div className="card stat-card" style={{ padding: "0.75rem 1rem", minWidth: 100 }}>
              <div className="stat-value" style={{ fontSize: "1.25rem" }}>2</div>
              <div className="stat-label">Tier level</div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <div className={`tab-item${tab === "log" ? " active" : ""}`} onClick={() => setTab("log")}>Log payment</div>
          <div className={`tab-item${tab === "webhooks" ? " active" : ""}`} onClick={() => setTab("webhooks")}>Webhook log</div>
          <div className={`tab-item${tab === "status" ? " active" : ""}`} onClick={() => setTab("status")}>Bond & reputation</div>
        </div>

        {tab === "log" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", maxWidth: 860 }}>
            {/* Form */}
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
                Log a payment manually
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label">Subject pseudonym</label>
                  <input
                    className="input-field"
                    placeholder="0x... (derived from subject + attester)"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    id="attester-subject-input"
                  />
                </div>
                <div>
                  <label className="input-label">Event type</label>
                  <select
                    className="input-field"
                    value={form.eventType}
                    onChange={(e) => set("eventType", e.target.value)}
                    id="attester-event-type"
                  >
                    {EVENT_TYPES.map((et) => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (₹ or USD)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. 24000"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    id="attester-amount-input"
                  />
                </div>
                <div>
                  <label className="input-label">Outcome</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.value}
                        id={`outcome-${o.value}`}
                        onClick={() => set("outcome", o.value)}
                        style={{
                          padding: "0.4rem 0.85rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${form.outcome === o.value ? o.color : "var(--vc-border)"}`,
                          background: form.outcome === o.value ? `${o.color}18` : "var(--vc-surface-2)",
                          color: form.outcome === o.value ? o.color : "var(--vc-text-muted)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label">Proof tier</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["1", "2", "3"].map((t) => (
                      <button
                        key={t}
                        id={`tier-${t}`}
                        onClick={() => set("proofTier", t)}
                        style={{
                          padding: "0.4rem 1rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${form.proofTier === t ? "var(--vc-violet)" : "var(--vc-border)"}`,
                          background: form.proofTier === t ? "rgba(124,58,237,0.12)" : "var(--vc-surface-2)",
                          color: form.proofTier === t ? "var(--vc-violet-light)" : "var(--vc-text-muted)",
                          cursor: "pointer",
                          fontWeight: 700,
                          transition: "all 0.15s",
                        }}
                      >
                        Tier {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.35rem" }}>
                    T1: signed · T2: source-verified receipt · T3: zkTLS (stretch)
                  </div>
                </div>
                <div>
                  <label className="input-label">Attester note (pinned to IPFS)</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Optional context (e.g. payout ref #12345)"
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                    id="attester-note-input"
                  />
                </div>
                <div style={{
                  padding: "0.6rem 0.85rem",
                  background: "rgba(124,58,237,0.06)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  color: "var(--vc-text-secondary)",
                }}>
                  Amount and outcome are hashed into a commitment — <strong>never stored as plaintext on-chain</strong>.
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                  id="attester-submit-btn"
                >
                  {submitting ? "Writing commitment…" : "Write attestation"}
                </button>
              </div>
            </div>

            {/* Recent attestations */}
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
                Recent attestations
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {MOCK_RECENT.map((r) => (
                  <div key={r.id} style={{
                    padding: "0.85rem",
                    background: "var(--vc-surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--vc-border)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <strong style={{ fontSize: "0.875rem" }}>{r.event} — {r.amount}</strong>
                      <span style={{
                        fontSize: "0.75rem", fontWeight: 600,
                        color: r.outcome === "ON_TIME" ? "var(--vc-success)" : "var(--vc-warning)",
                      }}>
                        {r.outcome === "ON_TIME" ? "✓ On time" : "⚠ Late"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <code className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>
                        {r.subject}
                      </code>
                      <span className={`badge badge-tier${r.tier}`} style={{ fontSize: "0.65rem" }}>T{r.tier}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>{r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "webhooks" && (
          <div className="card" style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="live-dot" />
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>Live webhook feed</h2>
              <span className="badge badge-pilot">pilot platform</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { ts: "07:24:11", worker: "Meena (W-001)", event: "GIG_PAYOUT", amount: "₹24,000", status: "✓ written", color: "var(--vc-success)" },
                { ts: "07:18:02", worker: "Raj (W-002)", event: "GIG_PAYOUT", amount: "₹19,500", status: "✓ written", color: "var(--vc-success)" },
                { ts: "07:01:55", worker: "Priya (W-003)", event: "GIG_PAYOUT", amount: "₹22,000", status: "⚠ late flag", color: "var(--vc-warning)" },
              ].map((log, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "0.6rem 0.85rem",
                  background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}>
                  <code className="mono" style={{ color: "var(--vc-text-muted)", flexShrink: 0 }}>{log.ts}</code>
                  <span style={{ color: "var(--vc-text-secondary)", flex: 1 }}>
                    {log.worker} · {log.event} · {log.amount}
                  </span>
                  <span style={{ color: log.color, fontWeight: 600, flexShrink: 0 }}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "status" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", maxWidth: 720 }}>
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>Bond status</h2>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 700, color: "var(--vc-violet-light)", marginBottom: "0.5rem" }}>
                50 MON
              </div>
              <div className="progress-track" style={{ marginBottom: "0.75rem" }}>
                <div className="progress-fill" style={{ width: "100%", background: "var(--vc-success)" }} />
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--vc-text-secondary)" }}>
                Minimum bond: 50 MON. Your bond is fully funded. A successful challenge against
                you slashes from this amount.
              </p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "1rem" }} id="top-up-bond-btn">
                Top up bond
              </button>
            </div>
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>Reputation history</h2>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 700, color: "var(--vc-success)", marginBottom: "0.5rem" }}>
                94 / 100
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                  <span>Attestations written</span>
                  <strong>1,284</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                  <span>Challenges lost</span>
                  <strong style={{ color: "var(--vc-danger)" }}>1</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--vc-text-secondary)" }}>
                  <span>Reports filed (reciprocity)</span>
                  <strong style={{ color: "var(--vc-success)" }}>312</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
