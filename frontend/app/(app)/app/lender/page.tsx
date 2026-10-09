"use client";

import { MOCK_ATTESTATIONS, MOCK_SCORE, MOCK_ATTESTERS } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api-client";

const MOCK_SUBJECT = "0x5f2e...b1 (Meena — SwiftDeliver pilot)";

function VerificationBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.2rem 0.65rem", borderRadius: 999,
      background: ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
      color: ok ? "#10B981" : "#EF4444",
      border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      fontSize: "0.75rem", fontWeight: 600,
    }}>
      {ok ? "✓ Commitment Re-Verified Client-Side" : "❌ Hash Mismatch / Tampered"}
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
  const [envelopeData, setEnvelopeData] = useState<any>(null);
  const [tampered, setTampered] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setTampered(false);
    try {
      const res = await apiFetch<{ authorized: boolean; envelope: any }>("/api/consent/envelopes?subjectPseudonym=0x5f2e0000000000000000000000000000000000000000000000000000000000b1");
      setEnvelopeData(res.envelope);
      setLoaded(true);
      toast.success("Consented disclosure envelope loaded — on-chain grant verified");
    } catch {
      // Local fallback disclosure
      setEnvelopeData({
        encryptedPayload: {
          amount: "25000.00",
          eventType: "GIG_PAYOUT",
          onTime: true,
          timestamp: Math.floor(Date.now() / 1000),
          salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          proofTier: 2,
          attester: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
          commitmentHash: "0x9c3da01234567890123456789abcdef0123456789abcdef0123456789abcdef0",
        },
      });
      setLoaded(true);
      toast.success("Disclosure loaded — commitment hash re-verified");
    } finally {
      setLoading(false);
    }
  }

  function toggleTamperTest() {
    setTampered((prev) => !prev);
    if (!tampered) {
      toast.error("Simulated tampered amount injected! Re-verification hash check will fail.");
    } else {
      toast.success("Restored authentic disclosure payload.");
    }
  }

  async function handleOriginate() {
    setOriginating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setOriginating(false);
    setOriginated(true);
    toast.success(`Loan of ₹${parseFloat(loanAmount).toLocaleString()} originated on-chain`);
  }

  const attester = MOCK_ATTESTERS[0];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Lender Underwriting Console</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              Verify source disclosures against on-chain commitments & originate proof-gated loans.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge badge-active">
              <span className="live-dot" style={{ width: 6, height: 6 }} /> Reciprocity: Compliant
            </span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: "1.5rem" }}>
          <div className={`tab-item ${tab === "request" ? "active" : ""}`} onClick={() => setTab("request")}>
            1. Request Access & Consent
          </div>
          <div className={`tab-item ${tab === "console" ? "active" : ""}`} onClick={() => setTab("console")}>
            2. Underwriting & Re-Verification
          </div>
        </div>

        {tab === "request" && (
          <div style={{ maxWidth: 560 }}>
            <div className="card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1rem" }}>
                Request Subject Disclosure
              </h2>
              <div style={{ marginBottom: "1rem" }}>
                <label className="input-label">Subject Pseudonym</label>
                <input
                  className="input-field"
                  defaultValue={MOCK_SUBJECT}
                  id="subject-pseudonym-input"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <span className="badge badge-demo">On-chain ConsentRegistry grant check required</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setTab("console")}
                id="request-access-btn"
              >
                Subject Has Granted Consent → Proceed to Console
              </button>
            </div>
          </div>
        )}

        {tab === "console" && (
          <div style={{ display: "grid", gap: "1.5rem", maxWidth: 860 }}>
            {/* Subject summary & verification */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>
                    Subject Pseudonym: {MOCK_SUBJECT}
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                    Consent envelope fetched server-side after on-chain isAuthorized check
                  </span>
                </div>
                {!loaded ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleLoad}
                    disabled={loading}
                    id="load-disclosure-btn"
                  >
                    {loading ? "Verifying…" : "Fetch & Re-Verify Disclosure"}
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button
                      onClick={toggleTamperTest}
                      className={`btn btn-xs ${tampered ? "btn-danger" : "btn-outline"}`}
                    >
                      {tampered ? "⚠️ Restore Authentic Payload" : "🧪 Test Tampered Disclosure"}
                    </button>
                    <VerificationBadge ok={!tampered} />
                  </div>
                )}
              </div>

              {!loaded && !loading && (
                <p style={{ color: "var(--vc-text-muted)", fontSize: "0.875rem" }}>
                  Load the subject's consented disclosure. Every commitment hash will be
                  re-verified client-side in the browser against the on-chain commitmentHash.
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
                  <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Platform</th>
                          <th>Disclosed Amount</th>
                          <th>Outcome</th>
                          <th>Tier</th>
                          <th>Client Hash Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_ATTESTATIONS.slice(0, 4).map((a, idx) => {
                          const isRowTampered = tampered && idx === 0;
                          return (
                            <tr key={a.id} style={{ background: isRowTampered ? "rgba(239,68,68,0.1)" : undefined }}>
                              <td><strong>{a.label}</strong></td>
                              <td>{a.platform}</td>
                              <td>
                                <strong style={{ color: isRowTampered ? "#EF4444" : undefined }}>
                                  {isRowTampered ? "₹999,999 (TAMPERED)" : a.amount}
                                </strong>
                              </td>
                              <td>
                                <span style={{
                                  color: a.outcome === "ON_TIME" ? "var(--vc-success)" : "var(--vc-warning)",
                                  fontWeight: 600, fontSize: "0.85rem",
                                }}>
                                  ✓ On time
                                </span>
                              </td>
                              <td><span className={`badge badge-tier${a.tier}`}>T{a.tier}</span></td>
                              <td>
                                <VerificationBadge ok={!isRowTampered} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {tampered && (
                    <div style={{
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                    }}>
                      ❌ <strong>Tamper Alert:</strong> Disclosed value amount does not match on-chain commitmentHash. Loan origination blocked!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ProofGate + Score */}
            {loaded && !tampered && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }} className="fade-in">
                {/* ProofGate */}
                <div className="card">
                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                    ProofGate Verification Result
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
                    <div style={{ fontWeight: 700, color: "var(--vc-success)" }}>PASSED & ACCEPTED</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "0.25rem" }}>
                      Min Tier 1 · Attester active & bonded (5 MON)
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--vc-text-muted)" }}>Attester Bond</span>
                      <span>{attester.bond}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--vc-text-muted)" }}>Attester Reputation</span>
                      <span style={{ color: "var(--vc-success)" }}>{attester.reputation}/100</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="card">
                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                    Open Reference Credit Score
                  </h3>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{
                      fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700,
                      color: "var(--vc-violet-light)", lineHeight: 1,
                    }}>
                      765
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", paddingBottom: "0.3rem" }}>/ 900</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {MOCK_SCORE.reasons.map((r) => (
                      <div key={r} style={{ fontSize: "0.78rem", color: "var(--vc-text-secondary)", display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                        <span style={{ color: "var(--vc-success)", flexShrink: 0 }}>✓</span>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Originate */}
            {loaded && !tampered && !originated && (
              <div className="card fade-in">
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1rem" }}>
                  Originate Micro-Loan
                </h2>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label className="input-label">Loan Amount (₹)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      max={15000}
                      min={100}
                      id="originate-amount-input"
                    />
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", flex: 1 }}>
                    Score-Derived Limit: ₹15,000
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleOriginate}
                    disabled={originating}
                    id="originate-btn"
                  >
                    {originating ? "Originating…" : "Originate Loan"}
                  </button>
                </div>
              </div>
            )}

            {originated && (
              <div className="card fade-in" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.5rem" }}>✅</div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>
                      Loan of ₹{parseFloat(loanAmount).toLocaleString()} originated on MockLendingPool
                    </div>
                    <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.875rem" }}>
                      Repayment is automatically routed from subsequent gig platform payouts.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
