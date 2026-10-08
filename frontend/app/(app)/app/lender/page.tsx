"use client";

import { MOCK_ATTESTATIONS, MOCK_SCORE, MOCK_ATTESTERS } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";

const MOCK_SUBJECT = "0x5f2e...b1 (Meena — SwiftDeliver pilot)";

function VerificationBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.2rem 0.6rem", borderRadius: 999,
      background: ok ? "var(--vc-success-dim)" : "var(--vc-danger-dim)",
      color: ok ? "var(--vc-success)" : "var(--vc-danger)",
      border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      fontSize: "0.75rem", fontWeight: 600,
    }}>
      {ok ? "✓ Verified" : "✗ Mismatch"}
    </span>
  );
}

export default function LenderPage() {
  const [tab, setTab] = useState<"request" | "console">("request");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [originating, setOriginating] = useState(false);
  const [originated, setOriginated] = useState(false);
  const [loanAmount, setLoanAmount] = useState("3000");

  async function handleLoad() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setLoaded(true);
    toast.success("Disclosure loaded — all commitment hashes verified");
  }

  async function handleOriginate() {
    setOriginating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setOriginating(false);
    setOriginated(true);
    toast.success(`Loan of ₹${parseFloat(loanAmount).toLocaleString()} originated on-chain`);
  }

  const attester = MOCK_ATTESTERS[0];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Lender console</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              Verify evidence, score it, originate a proof-gated loan.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge badge-active">
              <span className="live-dot" style={{ width: 6, height: 6 }} /> Reciprocity: compliant
            </span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="tabs">
          <div className={`tab-item ${tab === "request" ? "active" : ""}`} onClick={() => setTab("request")}>
            Request access
          </div>
          <div className={`tab-item ${tab === "console" ? "active" : ""}`} onClick={() => setTab("console")}>
            Underwriting console
          </div>
        </div>

        {tab === "request" && (
          <div style={{ maxWidth: 560 }}>
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1rem" }}>
                Request subject disclosure
              </h2>
              <div style={{ marginBottom: "1rem" }}>
                <label className="input-label">Subject pseudonym</label>
                <input
                  className="input-field"
                  defaultValue={MOCK_SUBJECT}
                  id="subject-pseudonym-input"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <span className="badge badge-demo">subject must grant consent before you can proceed</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setTab("console")}
                id="request-access-btn"
              >
                Subject has granted consent → proceed to console
              </button>
            </div>
          </div>
        )}

        {tab === "console" && (
          <div style={{ display: "grid", gap: "1.5rem", maxWidth: 860 }}>
            {/* Subject summary */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>
                  Subject: {MOCK_SUBJECT}
                </h2>
                {!loaded ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleLoad}
                    disabled={loading}
                    id="load-disclosure-btn"
                  >
                    {loading ? "Verifying…" : "Load & verify disclosure"}
                  </button>
                ) : (
                  <VerificationBadge ok={true} />
                )}
              </div>

              {!loaded && !loading && (
                <p style={{ color: "var(--vc-text-muted)", fontSize: "0.875rem" }}>
                  Load the subject's consented disclosure. Every commitment hash will be
                  re-verified client-side against the on-chain values.
                </p>
              )}

              {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[140, 100, 120].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 16, width: w, borderRadius: 4 }} />
                  ))}
                </div>
              )}

              {loaded && (
                <div className="fade-in">
                  {/* Attestation table */}
                  <div style={{ overflowX: "auto" }}>
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Platform</th>
                          <th>Amount</th>
                          <th>Outcome</th>
                          <th>Tier</th>
                          <th>Hash check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_ATTESTATIONS.slice(0, 4).map((a) => (
                          <tr key={a.id}>
                            <td><strong>{a.label}</strong></td>
                            <td>{a.platform}</td>
                            <td><strong>{a.amount}</strong></td>
                            <td>
                              <span style={{
                                color: a.outcome === "ON_TIME" ? "var(--vc-success)" :
                                       a.outcome === "LATE" ? "var(--vc-warning)" : "var(--vc-danger)",
                                fontWeight: 600, fontSize: "0.85rem",
                              }}>
                                {a.outcome === "ON_TIME" ? "✓ On time" : a.outcome === "LATE" ? "⚠ Late" : "✗"}
                              </span>
                            </td>
                            <td><span className={`badge badge-tier${a.tier}`}>T{a.tier}</span></td>
                            <td>
                              <VerificationBadge ok={a.status !== "SLASHED"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ProofGate + Score */}
            {loaded && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }} className="fade-in">
                {/* ProofGate */}
                <div className="card">
                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                    ProofGate result
                  </h3>
                  <div style={{
                    padding: "1rem",
                    background: "var(--vc-success-dim)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    textAlign: "center",
                    marginBottom: "1rem",
                  }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
                    <div style={{ fontWeight: 700, color: "var(--vc-success)" }}>ACCEPTED</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "0.25rem" }}>
                      min Tier 1 · attester active & bonded
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--vc-text-muted)" }}>Attester bond</span>
                      <span>{attester.bond}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--vc-text-muted)" }}>Attester reputation</span>
                      <span style={{ color: "var(--vc-success)" }}>{attester.reputation}/100</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--vc-text-muted)" }}>Limit multiplier (Tier 2)</span>
                      <span style={{ color: "var(--vc-violet-light)" }}>1.5×</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="card">
                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                    Open reference score
                  </h3>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{
                      fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700,
                      color: "var(--vc-violet-light)", lineHeight: 1,
                    }}>
                      {MOCK_SCORE.score}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", paddingBottom: "0.3rem" }}>/ 1000</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {MOCK_SCORE.reasons.map((r) => (
                      <div key={r} style={{ fontSize: "0.78rem", color: "var(--vc-text-secondary)", display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                        <span style={{ color: "var(--vc-success)", flexShrink: 0 }}>✓</span>
                        {r}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <span className="badge badge-demo">formula: open & recomputable</span>
                  </div>
                </div>
              </div>
            )}

            {/* Originate */}
            {loaded && !originated && (
              <div className="card fade-in">
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1rem" }}>
                  Originate loan
                </h2>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label className="input-label">Amount (₹)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      max={3000}
                      min={100}
                      id="originate-amount-input"
                    />
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", flex: 1 }}>
                    Limit: ₹3,000 (Tier 2 × 1.5× multiplier)
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleOriginate}
                    disabled={originating}
                    id="originate-btn"
                  >
                    {originating ? "Originating…" : "Originate loan"}
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <span className="badge badge-demo">demo stablecoin</span>
                </div>
              </div>
            )}

            {originated && (
              <div className="card fade-in" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.5rem" }}>✅</div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>
                      Loan of ₹{parseFloat(loanAmount).toLocaleString()} originated
                    </div>
                    <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.875rem" }}>
                      Repayment is automatically routed from the next payout. A LOAN_REPAYMENT
                      attestation will be written when each repayment lands.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reciprocity reminder */}
            <div className="card" style={{ background: "rgba(124,58,237,0.04)", borderColor: "rgba(124,58,237,0.2)" }}>
              <div style={{ fontSize: "0.875rem", color: "var(--vc-text-secondary)" }}>
                <strong style={{ color: "var(--vc-violet-light)" }}>Reciprocity:</strong>{" "}
                After lending, report repayments and defaults back to the registry to maintain
                your read access. Failure to report ends access within 30 days.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
